<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Maintenance;
use App\Models\Server;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Daemon\WingsClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Lo que un usuario puede hacer en la web, desde el bot de Discord.
 *
 * Cada petición llega con el ID de Discord de quien pulsa el comando; solo se actúa
 * sobre la cuenta vinculada a ese Discord y con los mismos permisos que en la web
 * (dueño o subusuario del servidor, Owner/Admin para lo de administración).
 */
class BotAccountController extends Controller
{
    private const STAFF = ['Owner', 'Admin'];

    public function account(string $discordId)
    {
        $user = $this->user($discordId);
        $servers = $this->accessible($user)->with('egg:id,name')->get();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $this->maskEmail($user->email),
                'avatar_url' => $user->avatar_url ? url($user->avatar_url) : null,
                'roles' => $user->getRoleNames()->values(),
                'staff' => $user->hasAnyRole(self::STAFF),
                'created_at' => $user->created_at?->toIso8601String(),
            ],
            'servers' => $servers->map(fn (Server $s) => $this->serverSummary($s)),
            'tickets' => [
                'open' => Ticket::where('user_id', $user->id)->where('status', '!=', 'closed')->count(),
                'total' => Ticket::where('user_id', $user->id)->count(),
            ],
            'billing' => $this->billing('account', $user),
        ]);
    }

    /** Cambia nombre o foto de perfil (la foto se descarga del CDN de Discord). */
    public function profile(Request $request, string $discordId)
    {
        $user = $this->user($discordId);
        $data = $request->validate([
            'name' => 'nullable|string|min:2|max:255',
            'avatar_url' => 'nullable|url|max:2000',
            'remove_avatar' => 'nullable|boolean',
        ]);

        if (filled($data['name'] ?? null)) {
            $user->name = trim($data['name']);
        }

        if (! empty($data['remove_avatar'])) {
            $this->deleteStoredAvatar($user);
            $user->avatar = null;
        } elseif (filled($data['avatar_url'] ?? null)) {
            $host = strtolower((string) parse_url($data['avatar_url'], PHP_URL_HOST));
            abort_unless(in_array($host, ['cdn.discordapp.com', 'media.discordapp.net'], true), 422, 'La imagen tiene que venir de Discord.');

            $res = Http::timeout(15)->withOptions(['stream' => false])->get($data['avatar_url']);
            abort_unless($res->successful(), 422, 'No se pudo descargar la imagen.');
            $body = $res->body();
            abort_if(strlen($body) > 2 * 1024 * 1024, 422, 'La imagen pesa más de 2 MB.');
            $info = @getimagesizefromstring($body);
            $ext = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp', 'image/gif' => 'gif'][$info['mime'] ?? ''] ?? null;
            abort_unless($ext, 422, 'El archivo no es una imagen válida (png, jpg, webp o gif).');

            $this->deleteStoredAvatar($user);
            $path = 'avatars/'.Str::random(40).'.'.$ext;
            Storage::disk('public')->put($path, $body);
            $user->avatar = $path;
        }

        $user->save();

        return response()->json([
            'name' => $user->name,
            'avatar_url' => $user->avatar_url ? url($user->avatar_url) : null,
        ]);
    }

    public function server(string $discordId, Server $server, WingsClient $wings)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);
        $server->load('egg:id,name');

        $live = null;
        try {
            $state = $wings->forServer($server)->timeout(4)->get('/servers/'.$server->uuid)->throw()->json();
            $u = $state['utilization'] ?? [];
            $live = [
                'state' => $state['state'] ?? 'offline',
                'cpu' => round(max(0, (float) ($u['cpu_absolute'] ?? 0)), 1),
                'memory_mb' => (int) round(($u['memory_bytes'] ?? 0) / 1048576),
                'disk_mb' => (int) round(($u['disk_bytes'] ?? 0) / 1048576),
                'uptime' => (int) (($u['uptime'] ?? 0) / 1000),
            ];
        } catch (ConnectionException|RequestException) {
            $live = ['state' => $server->status ? 'running' : 'offline'];
        }

        return response()->json(['server' => $this->serverSummary($server) + ['live' => $live]]);
    }

    public function power(Request $request, string $discordId, Server $server, WingsClient $wings)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);
        $data = $request->validate(['action' => 'required|in:start,stop,restart,kill']);
        abort_unless($server->installed_at, 409, 'La instalación todavía no ha terminado.');

        try {
            $wings->forServer($server)->post('/servers/'.$server->uuid.'/power', $data)->throw();
            $server->update(['status' => in_array($data['action'], ['start', 'restart'], true) ? 1 : 0]);

            return response()->json(['message' => 'ok']);
        } catch (ConnectionException|RequestException) {
            return response()->json(['error' => 'Wings no pudo ejecutar la acción.'], 502);
        }
    }

    public function command(Request $request, string $discordId, Server $server, WingsClient $wings)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);
        $data = $request->validate(['command' => 'required|string|max:1024']);

        try {
            $wings->forServer($server)->post('/servers/'.$server->uuid.'/commands', ['commands' => [$data['command']]])->throw();

            return response()->json(['message' => 'ok']);
        } catch (ConnectionException|RequestException) {
            return response()->json(['error' => 'No se pudo enviar el comando (¿el servidor está encendido?).'], 502);
        }
    }

    /** Nombre y descripción del servidor (dueño u Owner/Admin). */
    public function info(Request $request, string $discordId, Server $server)
    {
        $user = $this->user($discordId);
        abort_unless($user->id === $server->owner_id || $user->hasAnyRole(self::STAFF), 403, 'Solo el dueño del servidor puede cambiar sus datos.');
        $data = $request->validate([
            'name' => 'nullable|string|min:2|max:60',
            'description' => 'nullable|string|max:500',
        ]);
        $server->update(array_filter([
            'name' => isset($data['name']) ? trim($data['name']) : null,
            'description' => array_key_exists('description', $data) ? (string) $data['description'] : null,
        ], fn ($v) => $v !== null));

        return response()->json(['server' => $this->serverSummary($server->fresh('egg'))]);
    }

    /** Ajustes del juego (server.properties): se reutiliza el controlador de la web con el usuario vinculado. */
    public function game(Request $request, string $discordId, Server $server)
    {
        $user = $this->user($discordId);
        $as = Request::create('/', $request->isMethod('get') ? 'GET' : 'PUT', $request->isMethod('get') ? [] : ['values' => (array) $request->input('values')]);
        $as->headers->set('Accept', 'application/json');
        $as->setUserResolver(fn () => $user);
        $controller = app(ServerGameController::class);

        return $request->isMethod('get')
            ? app()->call([$controller, 'show'], ['request' => $as, 'server' => $server])
            : app()->call([$controller, 'update'], ['request' => $as, 'server' => $server]);
    }

    public function checkin(string $discordId)
    {
        $user = $this->user($discordId);
        $res = $this->billing('checkin', $user);
        abort_unless($res !== null, 502, 'La tienda no responde ahora mismo.');

        return response()->json($res);
    }

    public function tickets(string $discordId)
    {
        $user = $this->user($discordId);

        return response()->json([
            'tickets' => Ticket::where('user_id', $user->id)->latest()->limit(10)->get(['id', 'subject', 'status', 'created_at', 'updated_at'])
                ->map(fn ($t) => [
                    'id' => $t->id,
                    'subject' => $t->subject,
                    'status' => $t->status,
                    'updated_at' => $t->updated_at?->toIso8601String(),
                    'url' => url('/tickets/'.$t->id),
                ]),
        ]);
    }

    /** Anuncio creado por el staff desde Discord (se publica en la web y en Discord). */
    public function announce(Request $request, string $discordId)
    {
        $user = $this->staff($discordId);
        $data = $request->validate([
            'type' => 'required|in:'.implode(',', Announcement::TYPES),
            'title' => 'required|string|max:120',
            'message' => 'nullable|string|max:2000',
            'coupon_code' => 'nullable|string|max:40',
            'days' => 'nullable|integer|min:1|max:90',
        ]);

        $a = Announcement::create([
            'type' => $data['type'],
            'title' => $data['title'],
            'message' => $data['message'] ?? '',
            'coupon_code' => $data['coupon_code'] ?? null,
            'places' => Announcement::PLACES,
            'popup' => false,
            'enabled' => true,
            'starts_at' => now(),
            'ends_at' => isset($data['days']) ? now()->addDays($data['days']) : null,
            'created_by' => $user->id,
        ]);

        return response()->json(['announcement' => $a->toPublic()], 201);
    }

    public function maintenance(Request $request, string $discordId)
    {
        $user = $this->staff($discordId);
        $data = $request->validate([
            'title' => 'required|string|max:120',
            'message' => 'nullable|string|max:2000',
            'starts_in' => 'required|integer|min:0|max:43200', // minutos
            'duration' => 'required|integer|min:5|max:10080',  // minutos
            'block_access' => 'nullable|boolean',
        ]);
        $start = now()->addMinutes($data['starts_in']);

        $m = Maintenance::create([
            'title' => $data['title'],
            'message' => $data['message'] ?? null,
            'starts_at' => $start,
            'ends_at' => $start->copy()->addMinutes($data['duration']),
            'scope' => Maintenance::SCOPES,
            'block_access' => (bool) ($data['block_access'] ?? false),
            'created_by' => $user->id,
        ]);

        return response()->json(['maintenance' => $m->toPublic()], 201);
    }

    /* ------------------------------------------------------------------ */

    /** /vincular <código>: el código sale en Ajustes → Perfil del panel. */
    public function link(Request $request, string $discordId)
    {
        $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $request->input('code')));
        $uid = $code !== '' ? \Illuminate\Support\Facades\Cache::pull('discord-link:'.$code) : null;
        abort_unless($uid && ($user = User::find($uid)), 422, 'Código no válido o caducado. Genera uno nuevo en Ajustes → Perfil.');
        \Illuminate\Support\Facades\Cache::forget('discord-link-user:'.$uid);

        $other = User::where('discord_id', $discordId)->where('id', '!=', $user->id)->first();
        abort_if($other, 409, 'Este Discord ya está vinculado a otra cuenta del panel. Desvincúlalo allí primero (Ajustes → Perfil).');

        $user->forceFill(['discord_id' => $discordId])->save();
        if (class_exists(\App\Support\Ranks::class)) {
            \App\Support\Ranks::sync($user);
        }

        return response()->json(['user' => ['name' => $user->name, 'email' => $user->email]]);
    }

    /**
     * Quien entró al Discord con la invitación de otra persona y vincula su cuenta queda como
     * referido de esa persona en la tienda (mismos premios que el enlace de /monedas).
     */
    public function referral(Request $request, string $discordId)
    {
        $data = $request->validate([
            'inviter' => ['required', 'regex:/^[0-9]{5,25}$/'],
            'joined_at' => ['required', 'date'],
        ]);
        $user = $this->user($discordId);
        $inviter = User::where('discord_id', $data['inviter'])->first();
        abort_unless($inviter, 404, 'inviter_not_linked');
        if ($inviter->id === $user->id) {
            return response()->json(['status' => 'self']);
        }
        $res = $this->billing('referral', $user, ['inviter_email' => $inviter->email, 'joined_at' => $data['joined_at']], true);
        abort_unless($res !== null, 502, 'billing_unavailable');
        abort_if(($res['status_code'] ?? 200) === 404, 404, $res['error'] ?? 'not_found');

        return response()->json(['status' => $res['status'] ?? 'unknown', 'inviter' => $inviter->name]);
    }

    private function user(string $discordId): User
    {
        $user = User::where('discord_id', $discordId)->first();
        abort_unless($user, 404, 'not_linked');

        return $user;
    }

    private function staff(string $discordId): User
    {
        $user = $this->user($discordId);
        abort_unless($user->hasAnyRole(self::STAFF), 403, 'Solo Owner y Admin.');

        return $user;
    }

    /** Mismo criterio que la web: dueño, subusuario u Owner/Admin. */
    private function authorizeServer(User $user, Server $server): void
    {
        abort_unless(
            $user->id === $server->owner_id
            || $user->hasAnyRole(self::STAFF)
            || $server->subusers()->where('user_id', $user->id)->exists(),
            403,
            'No tienes permiso sobre este servidor.'
        );
    }

    private function accessible(User $user)
    {
        return Server::query()
            ->where(fn ($q) => $q->where('owner_id', $user->id)
                ->orWhereIn('id', fn ($s) => $s->select('server_id')->from('subusers')->where('user_id', $user->id)))
            ->orderBy('id')
            ->limit(25);
    }

    private function serverSummary(Server $s): array
    {
        return [
            'id' => $s->id,
            'name' => $s->name,
            'description' => $s->description,
            'egg' => $s->egg?->name,
            'memory' => (int) $s->memory,
            'cpu' => (int) $s->cpu,
            'disk' => (int) $s->disk,
            'address' => $s->publicAddress(),
            'installed' => $s->installed_at !== null,
            'suspended' => $s->active !== null && (int) $s->active === 0,
            'status' => $s->status ? 'running' : 'offline',
            'url' => url('/servers/'.$s->id.'/console'),
        ];
    }

    /** Compra desde Discord: precio de un plan con el descuento de esa persona. */
    public function storeQuote(Request $request, string $discordId)
    {
        $data = $request->validate(['plan_id' => 'required|integer|min:1']);

        return $this->storeProxy('quote', $this->user($discordId), $data);
    }

    /** Compra desde Discord: crea pedido + factura y devuelve el enlace de pago. */
    public function storeOrder(Request $request, string $discordId)
    {
        $data = $request->validate([
            'plan_id' => 'required|integer|min:1',
            'cycle' => 'required|string|max:20',
            'name' => 'nullable|string|max:60',
        ]);

        return $this->storeProxy('order', $this->user($discordId), $data);
    }

    /** Reenvía a la tienda y devuelve su respuesta tal cual (con su código), para que el bot muestre el motivo. */
    private function storeProxy(string $action, User $user, array $data)
    {
        $base = rtrim((string) config('services.billing.url'), '/');
        $token = (string) config('services.billing.token');
        abort_if($base === '' || $token === '' || ! $user->email, 502, 'La tienda no responde ahora mismo.');
        try {
            $ca = (string) config('services.billing.ca');
            $res = Http::withHeaders(['X-Billing-Token' => $token])->acceptJson()->timeout(12)
                ->when($ca !== '', fn ($h) => $h->withOptions(['verify' => $ca]))
                ->post($base.'/api/panel/bot/'.$action, ['email' => $user->email] + $data);
        } catch (\Throwable $e) {
            report($e);
            abort(502, 'La tienda no responde ahora mismo.');
        }
        $status = $res->status();
        abort_if($status >= 500 || $res->json() === null, 502, 'La tienda no responde ahora mismo.');

        return response()->json($res->json(), $status);
    }

    private function billing(string $action, User $user, array $extra = [], bool $with404 = false): ?array
    {
        $base = rtrim((string) config('services.billing.url'), '/');
        $token = (string) config('services.billing.token');
        if ($base === '' || $token === '' || ! $user->email) {
            return null;
        }
        try {
            // En el VPS la tienda se sirve desde el nginx local con su propio certificado:
            // BILLING_CA_BUNDLE apunta a ese certificado para poder validarlo.
            $ca = (string) config('services.billing.ca');
            $res = Http::withHeaders(['X-Billing-Token' => $token])->acceptJson()->timeout(8)
                ->when($ca !== '', fn ($h) => $h->withOptions(['verify' => $ca]))
                ->post($base.'/api/panel/bot/'.$action, ['email' => $user->email] + $extra);

            if ($with404 && $res->status() === 404) {
                return ['status_code' => 404, 'error' => $res->json('error') ?? 'not_found'];
            }

            return $res->successful() ? $res->json() : null;
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }

    private function deleteStoredAvatar(User $user): void
    {
        $current = (string) ($user->getAttributes()['avatar'] ?? '');
        if ($current !== '' && ! preg_match('#^(https?:)?//#i', $current)) {
            Storage::disk('public')->delete($current);
        }
    }

    private function maskEmail(?string $email): ?string
    {
        if (! $email || ! str_contains($email, '@')) {
            return $email;
        }
        [$local, $domain] = explode('@', $email, 2);

        return Str::substr($local, 0, 2).str_repeat('•', max(1, Str::length($local) - 2)).'@'.$domain;
    }
}
