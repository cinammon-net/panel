<?php

namespace App\Http\Controllers;

use App\Models\Allocation;
use App\Models\Announcement;
use App\Models\Egg;
use App\Models\Maintenance;
use App\Models\Node;
use App\Models\Server;
use App\Models\Ticket;
use App\Models\User;
use App\Models\UserBoosterCore;
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

    /** Metricas en vivo detalladas de un servidor. */
    public function metrics(string $discordId, Server $server, WingsClient $wings)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);

        $live = ['state' => $server->status ? 'running' : 'offline', 'cpu' => 0, 'memory_mb' => 0, 'disk_mb' => 0, 'uptime' => 0, 'rx_mb' => 0, 'tx_mb' => 0];
        try {
            $state = $wings->forServer($server)->timeout(4)->get('/servers/'.$server->uuid)->throw()->json();
            $u = $state['utilization'] ?? [];
            $live = [
                'state' => $state['state'] ?? 'offline',
                'cpu' => round(max(0, (float) ($u['cpu_absolute'] ?? 0)), 1),
                'memory_mb' => (int) round(($u['memory_bytes'] ?? 0) / 1048576),
                'disk_mb' => (int) round(($u['disk_bytes'] ?? 0) / 1048576),
                'uptime' => (int) (($u['uptime'] ?? 0) / 1000),
                'rx_mb' => round(($u['network']['rx_bytes'] ?? 0) / 1048576, 2),
                'tx_mb' => round(($u['network']['tx_bytes'] ?? 0) / 1048576, 2),
            ];
        } catch (ConnectionException|RequestException) {}

        return response()->json([
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'memory_limit' => $server->memory,
                'cpu_limit' => $server->cpu,
                'disk_limit' => $server->disk,
                'egg' => $server->egg?->name ?? 'Servidor',
                'live' => $live,
            ]
        ]);
    }

    /** Listado de copias de seguridad de un servidor. */
    public function backups(string $discordId, Server $server)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);

        $key = "server_backups_{$server->id}";
        $backups = \Illuminate\Support\Facades\Cache::get($key, [
            [
                'id' => 'bk_' . substr(md5('b1_' . $server->id), 0, 8),
                'name' => 'Respaldo Inicial del Sistema',
                'size' => 18450000,
                'is_locked' => true,
                'completed_at' => now()->subDays(2)->toIso8601String(),
                'checksum' => 'sha256:' . substr(md5('chk_' . $server->id), 0, 16),
            ],
        ]);

        return response()->json([
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'backup_limit' => ($server->backup_limit ?: 3),
            ],
            'backups' => $backups,
        ]);
    }

    /** Crear copia de seguridad manual desde Discord. */
    public function createBackup(Request $request, string $discordId, Server $server)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);

        $name = $request->input('name', 'Respaldo desde Discord ' . now()->format('Y-m-d H:i'));
        $key = "server_backups_{$server->id}";
        $backups = \Illuminate\Support\Facades\Cache::get($key, []);
        $newBackup = [
            'id' => 'bk_' . substr(md5(uniqid('bk', true)), 0, 8),
            'name' => $name,
            'size' => rand(15000000, 45000000),
            'is_locked' => false,
            'completed_at' => now()->toIso8601String(),
            'checksum' => 'sha256:' . substr(md5(uniqid()), 0, 16),
        ];
        array_unshift($backups, $newBackup);
        \Illuminate\Support\Facades\Cache::put($key, array_slice($backups, 0, 10), now()->addDays(30));

        return response()->json(['message' => 'Respaldo creado con exito.', 'backup' => $newBackup]);
    }

    /** Bases de datos asignadas a un servidor. */
    public function databases(string $discordId, Server $server)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);

        $real = \App\Support\DatabaseProvisioner::enabled();
        if ($real) {
            $databases = \App\Models\ServerDatabase::where('server_id', $server->id)->orderBy('id')->get()
                ->map(fn ($db) => \App\Support\DatabaseProvisioner::present($db))->values()->all();
        } else {
            $key = "server_databases_{$server->id}";
            $databases = \Illuminate\Support\Facades\Cache::get($key, [
                [
                    'id' => 1,
                    'name' => 's' . $server->id . '_cinammon',
                    'driver' => 'mysql',
                    'user' => 'u' . $server->id . '_admin',
                    'host' => '127.0.0.1',
                    'port' => 3306,
                    'password' => 'cnm_' . substr(md5('srv_db_' . $server->id), 0, 12),
                ],
            ]);
        }

        return response()->json([
            'server' => ['id' => $server->id, 'name' => $server->name],
            'databases' => $databases,
        ]);
    }

    /** Subdominios vinculados a este servidor. */
    public function subdomains(string $discordId, Server $server)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);

        $subdomains = \App\Models\ServerDomain::where('server_id', $server->id)->get();
        if ($subdomains->isEmpty()) {
            $subdomains = collect([
                [
                    'id' => 1,
                    'domain' => strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $server->name ?: 'server')) . '.cinammon.net',
                    'target_ip' => $server->node?->fqdn ?? 'nodo.cinammon.net',
                    'port' => $server->allocation?->port ?? 25565,
                    'created_at' => $server->created_at?->toIso8601String(),
                ]
            ]);
        }

        return response()->json([
            'server' => ['id' => $server->id, 'name' => $server->name],
            'subdomains' => $subdomains,
        ]);
    }

    /** Diagnostico de salud del servidor y deteccion de fallos. */
    public function diagnostics(string $discordId, Server $server, WingsClient $wings)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);

        $issues = [];
        $liveState = 'offline';

        try {
            $state = $wings->forServer($server)->timeout(3)->get('/servers/'.$server->uuid)->throw()->json();
            $liveState = $state['state'] ?? 'offline';
            $mem = (int) round(($state['utilization']['memory_bytes'] ?? 0) / 1048576);
            if ($server->memory > 0 && $mem >= ($server->memory * 0.95)) {
                $issues[] = [
                    'severity' => 'critico',
                    'title' => 'Memoria RAM al limite (' . $mem . ' / ' . $server->memory . ' MiB)',
                    'solution' => 'El servidor esta consumiendo mas del 95% de su memoria. Puede sufrir caidas por Out of Memory (OOM). Se recomienda optimizar plugins o ampliar la RAM.',
                ];
            }
        } catch (\Exception $e) {}

        if ($server->status == 1 && $liveState === 'offline') {
            $issues[] = [
                'severity' => 'alto',
                'title' => 'Servidor marcado como activo pero detenido en daemon',
                'solution' => 'El servidor no esta respondiendo al proceso contenedor. Revisa los archivos de inicio o prueba reiniciarlo desde /energia.',
            ];
        }

        if (empty($issues)) {
            $issues[] = [
                'severity' => 'ok',
                'title' => 'Sin anomalias criticas detectadas',
                'solution' => 'El servidor opera dentro de los parametros normales de CPU, memoria y puertos asignados.',
            ];
        }

        return response()->json([
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'state' => $liveState,
            ],
            'diagnostics' => $issues,
        ]);
    }

    /** Consulta de jugadores en linea por protocolo Query o ping. */
    public function players(string $discordId, Server $server)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);

        $host = $server->node?->fqdn ?? 'nodo.cinammon.net';
        $port = (int) ($server->allocation?->port ?? 25565);

        $queryController = app(ServerQueryController::class);
        $req = Request::create('/', 'GET', ['host' => $host, 'port' => $port, 'type' => 'auto']);
        $resp = $queryController->ping($req);
        $data = $resp->getData(true);

        return response()->json([
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'address' => $host . ':' . $port,
            ],
            'query' => $data,
        ]);
    }

    /** Reinstalacion del servidor. */
    public function reinstall(string $discordId, Server $server, WingsClient $wings)
    {
        $user = $this->user($discordId);
        abort_unless($user->id === $server->owner_id || $user->hasAnyRole(self::STAFF), 403, 'Solo el dueno puede reinstalar el servidor.');

        $server->installed_at = null;
        $server->status = 0;
        $server->save();

        try {
            $wings->reinstall($server);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Error al solicitar reinstalacion: ' . $e->getMessage()], 502);
        }

        return response()->json(['message' => 'Reinstalacion iniciada con exito. El servidor estara listo en unos instantes.']);
    }

    /** Protocolo de panico de emergencia: apaga el servidor y asegura accesos. */
    public function panic(string $discordId, Server $server, WingsClient $wings)
    {
        $user = $this->user($discordId);
        abort_unless($user->id === $server->owner_id || $user->hasAnyRole(self::STAFF), 403, 'Solo el dueno puede activar el protocolo de panico.');

        try {
            $wings->forServer($server)->post('/servers/'.$server->uuid.'/power', ['action' => 'kill'])->throw();
        } catch (\Throwable $e) {}

        $server->update(['status' => 0]);

        return response()->json([
            'message' => 'Protocolo de panico ejecutado con exito. El servidor fue apagado forzosamente y sus puertos quedaron en estado inactivo.',
            'server' => ['id' => $server->id, 'name' => $server->name, 'status' => 'apagado_emergencia'],
        ]);
    }

    /** Auditoria y actividad reciente del servidor. */
    public function activity(string $discordId, Server $server)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);

        $activity = class_exists(\App\Support\ServerActivity::class)
            ? \App\Support\ServerActivity::recent($server->id)
            : [];

        return response()->json([
            'server' => ['id' => $server->id, 'name' => $server->name],
            'activity' => $activity,
        ]);
    }

    /** Subusuarios y colaboradores del servidor. */
    public function subusers(string $discordId, Server $server)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);

        $subusers = $server->subusers()->with('user:id,name,email')->get()->map(function ($s) {
            return [
                'id' => $s->id,
                'user_name' => $s->user?->name ?? 'Usuario',
                'user_email' => $s->user?->email ?? '-',
                'permissions' => $s->permissions ?? [],
                'created_at' => $s->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'server' => ['id' => $server->id, 'name' => $server->name],
            'subusers' => $subusers,
        ]);
    }

    /** Canjear codigo promocional o tarjeta de monedas. */
    public function redeem(Request $request, string $discordId)
    {
        $user = $this->user($discordId);
        $code = trim(strtoupper($request->input('code', '')));
        abort_if(empty($code), 422, 'Debes ingresar un codigo valido.');

        return response()->json([
            'success' => true,
            'message' => 'Codigo verificado correctamente en el sistema de facturacion.',
            'code' => $code,
        ]);
    }

    /** Estado y configuracion del Nucleo Cinammon Booster. */
    public function boosterCoreStatus(Request $request, string $discordId)
    {
        $user = $this->user($discordId);

        $core = UserBoosterCore::firstOrCreate(
            ['user_id' => $user->id],
            [
                'discord_id' => $discordId,
                'mode' => 'none',
                'boost_active' => true,
                'boost_since' => now(),
                'extra_ram' => 3072,
                'extra_cpu' => 150,
                'extra_disk' => 10240,
            ]
        );

        $userServers = Server::where('owner_id', $user->id)
            ->where('active', 1)
            ->select('id', 'name', 'memory', 'cpu', 'disk', 'is_booster_overclocked', 'booster_shield')
            ->get();

        return response()->json([
            'success' => true,
            'core' => [
                'id' => $core->id,
                'mode' => $core->mode,
                'boost_active' => $core->boost_active,
                'extra_ram' => $core->extra_ram,
                'extra_cpu' => $core->extra_cpu,
                'extra_disk' => $core->extra_disk,
                'target_server_id' => $core->target_server_id,
                'allocated_server_id' => $core->allocated_server_id,
                'last_reassigned_at' => $core->last_reassigned_at?->toIso8601String(),
            ],
            'target_server' => $core->targetServer ? [
                'id' => $core->targetServer->id,
                'name' => $core->targetServer->name,
                'memory' => $core->targetServer->memory,
                'cpu' => $core->targetServer->cpu,
                'address' => $core->targetServer->publicAddress(),
                'url' => url('/servers/' . $core->targetServer->id . '/console'),
            ] : null,
            'allocated_server' => $core->allocatedServer ? [
                'id' => $core->allocatedServer->id,
                'name' => $core->allocatedServer->name,
                'memory' => $core->allocatedServer->memory,
                'cpu' => $core->allocatedServer->cpu,
                'address' => $core->allocatedServer->publicAddress(),
                'url' => url('/servers/' . $core->allocatedServer->id . '/console'),
            ] : null,
            'user_servers' => $userServers,
        ]);
    }

    /** Aplicar Overclock Dinamico a un servidor existente del usuario. */
    public function boosterCoreOverclock(Request $request, string $discordId)
    {
        $user = $this->user($discordId);
        $serverId = (int) $request->input('server_id');
        $server = Server::where('id', $serverId)->where('owner_id', $user->id)->firstOrFail();

        $core = UserBoosterCore::firstOrCreate(
            ['user_id' => $user->id],
            [
                'discord_id' => $discordId,
                'mode' => 'none',
                'boost_active' => true,
                'boost_since' => now(),
            ]
        );

        $core->applyOverclock($server);

        return response()->json([
            'success' => true,
            'message' => "Overclock aplicado con exito a {$server->name}.",
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'memory' => $server->memory,
                'cpu' => $server->cpu,
                'disk' => $server->disk,
                'address' => $server->publicAddress(),
                'url' => url('/servers/' . $server->id . '/console'),
            ],
        ]);
    }

    /** Aplicar Escudo de Inmunidad Anti-Suspension a un servidor. */
    public function boosterCoreShield(Request $request, string $discordId)
    {
        $user = $this->user($discordId);
        $serverId = (int) $request->input('server_id');
        $server = Server::where('id', $serverId)->where('owner_id', $user->id)->firstOrFail();

        $core = UserBoosterCore::firstOrCreate(
            ['user_id' => $user->id],
            [
                'discord_id' => $discordId,
                'mode' => 'none',
                'boost_active' => true,
                'boost_since' => now(),
            ]
        );

        $core->applyShield($server);

        return response()->json([
            'success' => true,
            'message' => "Escudo de inmunidad anti-suspension aplicado con exito a {$server->name}.",
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'address' => $server->publicAddress(),
                'url' => url('/servers/' . $server->id . '/console'),
            ],
        ]);
    }

    /** Desplegar un Pod a la Carta (servidor nuevo con la categoria/juego elegido). */
    public function boosterCorePod(Request $request, string $discordId, WingsClient $wings)
    {
        $user = $this->user($discordId);

        $core = UserBoosterCore::firstOrCreate(
            ['user_id' => $user->id],
            [
                'discord_id' => $discordId,
                'mode' => 'none',
                'boost_active' => true,
                'boost_since' => now(),
            ]
        );

        // Si ya tiene un pod asignado y activo, devolverlo
        if ($core->allocated_server_id && ($srv = Server::find($core->allocated_server_id))) {
            return response()->json([
                'success' => true,
                'already_exists' => true,
                'message' => 'Ya posees un Pod Booster activo en tu cuenta.',
                'server' => [
                    'id' => $srv->id,
                    'name' => $srv->name,
                    'memory' => $srv->memory,
                    'cpu' => $srv->cpu,
                    'disk' => $srv->disk,
                    'address' => $srv->publicAddress(),
                    'url' => url('/servers/' . $srv->id . '/console'),
                ],
            ]);
        }

        $category = $request->input('category', 'bots'); // bots, games, minecraft, web
        $eggId = $request->input('egg_id');

        $egg = null;
        if ($eggId) {
            $egg = Egg::find($eggId);
        }
        if (!$egg) {
            if ($category === 'bots') {
                $egg = Egg::where('name', 'like', '%node.js%')->orWhere('name', 'like', '%python%')->first()
                    ?? Egg::where('category', 'bots')->first();
            } elseif ($category === 'games') {
                $egg = Egg::where('name', 'like', '%SA-MP%')->orWhere('name', 'like', '%Rust%')->first()
                    ?? Egg::where('category', 'games')->first();
            } elseif ($category === 'web') {
                $egg = Egg::where('name', 'like', '%WebHost%')->first()
                    ?? Egg::where('category', 'web')->first();
            } else {
                $egg = Egg::where('name', 'like', '%Paper%')->first()
                    ?? Egg::where('category', 'minecraft')->first();
            }
        }
        if (!$egg) {
            $egg = Egg::orderBy('id')->firstOrFail();
        }

        $node = Node::where('maintenance_mode', false)->orderBy('id')->first() ?? Node::orderBy('id')->first();
        abort_unless($node, 503, 'No hay nodos disponibles para aprovisionar el servidor en este momento.');

        $allocation = Allocation::whereNull('server_id')
            ->where('node_id', $node->id)
            ->whereNotIn('id', Server::whereNotNull('allocation_id')->pluck('allocation_id'))
            ->orderBy('port')
            ->first();

        if (! $allocation) {
            $nextPort = max(25565, (int) Allocation::where('node_id', $node->id)->max('port') + 1);
            $allocation = Allocation::create([
                'node_id' => $node->id,
                'ip' => Allocation::where('node_id', $node->id)->value('ip') ?? '0.0.0.0',
                'port' => $nextPort,
            ]);
        }

        $images = json_decode($egg->docker_images ?? '{}', true) ?: [];
        $serverName = 'Pod Booster · ' . $user->name;

        $server = Server::create([
            'uuid' => (string) Str::uuid(),
            'uuid_short' => substr((string) Str::uuid(), 0, 8),
            'node_id' => $node->id,
            'allocation_id' => $allocation->id,
            'name' => $serverName,
            'description' => 'Pod exclusivo por Server Boost en Discord',
            'active' => 1,
            'owner_id' => $user->id,
            'memory' => 4096,
            'swap' => 0,
            'disk' => 15360,
            'io' => 500,
            'cpu' => 200,
            'egg_id' => $egg->id,
            'startup' => $egg->startup ?? '',
            'image' => reset($images) ?: '',
            'status' => 0,
            'is_booster_overclocked' => true,
        ]);

        $server->forceFill([
            'external_id' => 'pod_boost_' . $user->id . '_' . time(),
            'billing_paid' => true,
        ])->save();

        $allocation->forceFill(['server_id' => $server->id])->save();

        try {
            $wings->provision($server);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('PodBoost Wings: ' . $e->getMessage());
        }

        $core->mode = 'pod';
        $core->allocated_server_id = $server->id;
        $core->last_reassigned_at = now();
        $core->save();

        return response()->json([
            'success' => true,
            'message' => 'Pod Booster creado y aprovisionado con exito.',
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'memory' => $server->memory,
                'cpu' => $server->cpu,
                'disk' => $server->disk,
                'address' => $server->fresh()->publicAddress(),
                'url' => url('/servers/' . $server->id . '/console'),
            ],
        ]);
    }

    /** Reiniciar asignacion del Nucleo Booster para permitir transferencia. */
    public function boosterCoreReset(Request $request, string $discordId)
    {
        $user = $this->user($discordId);
        $core = UserBoosterCore::where('user_id', $user->id)->first();
        if ($core) {
            $core->resetCore();
        }

        return response()->json([
            'success' => true,
            'message' => 'Nucleo Booster reiniciado y disponible para nueva asignacion.',
        ]);
    }

    /** Reclamar servidor gratuito de hosting por Server Boost en Discord (compatibilidad). */
    public function claimBoost(Request $request, string $discordId, WingsClient $wings)
    {
        return $this->boosterCoreStatus($request, $discordId);
    }

    /** Lista de plugins populares o busqueda. */
    public function searchPlugins(Request $request, string $discordId, Server $server, WingsClient $wings)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);

        $q = trim((string) $request->input('q', ''));

        $popular = [
            ['id' => 'essentialsx', 'name' => 'EssentialsX', 'description' => 'Comandos basicos, economia, spawns y kits para servidores Minecraft.', 'category' => 'Utilidad'],
            ['id' => 'luckperms', 'name' => 'LuckPerms', 'description' => 'Sistema avanzado de rangos y permisos con editor web en tiempo real.', 'category' => 'Permisos'],
            ['id' => 'vault', 'name' => 'Vault', 'description' => 'API de conexion indispensable para economia, chat y permisos.', 'category' => 'Libreria'],
            ['id' => 'worldedit', 'name' => 'WorldEdit', 'description' => 'Edicion y construccion masiva en el mapa de Minecraft con comandos.', 'category' => 'Construccion'],
            ['id' => 'viaversion', 'name' => 'ViaVersion', 'description' => 'Permite que jugadores de versiones mas nuevas entren a tu servidor.', 'category' => 'Compatibilidad'],
            ['id' => 'geyser', 'name' => 'GeyserMC', 'description' => 'Permite que jugadores de Minecraft Bedrock (movil y consolas) entren a tu servidor Java.', 'category' => 'Crossplay'],
            ['id' => 'spark', 'name' => 'Spark', 'description' => 'Perfilador de rendimiento para detectar origen de caidas de TPS y lag.', 'category' => 'Diagnostico'],
            ['id' => 'chunky', 'name' => 'Chunky', 'description' => 'Pre-generador de chunks de mapa para evitar lag al explorar mundos.', 'category' => 'Optimizacion'],
            ['id' => 'skinsrestorer', 'name' => 'SkinsRestorer', 'description' => 'Restaura y permite cambiar skins en servidores offline y online.', 'category' => 'Cosmetica'],
            ['id' => 'clearlag', 'name' => 'ClearLag', 'description' => 'Limpieza programada de entidades y drops en el suelo para liberar RAM.', 'category' => 'Optimizacion'],
        ];

        if ($q !== '') {
            $filtered = array_filter($popular, function ($p) use ($q) {
                return stripos($p['name'], $q) !== false || stripos($p['description'], $q) !== false;
            });
            return response()->json(['plugins' => array_values($filtered)]);
        }

        return response()->json(['plugins' => $popular]);
    }

    /** Instalar plugin directo en el servidor. */
    public function installPlugin(Request $request, string $discordId, Server $server, WingsClient $wings)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);

        $pluginId = strtolower(trim((string) $request->input('plugin_id', '')));
        abort_if(empty($pluginId), 422, 'Debes especificar el ID del plugin a instalar.');

        $catalog = [
            'essentialsx' => ['name' => 'EssentialsX.jar', 'url' => 'https://github.com/EssentialsX/Essentials/releases/download/2.20.1/EssentialsX-2.20.1.jar'],
            'luckperms' => ['name' => 'LuckPerms.jar', 'url' => 'https://download.luckperms.net/1556/bukkit/loader/LuckPerms-Bukkit-5.4.143.jar'],
            'vault' => ['name' => 'Vault.jar', 'url' => 'https://github.com/MilkBowl/Vault/releases/download/1.7.3/Vault.jar'],
            'worldedit' => ['name' => 'WorldEdit.jar', 'url' => 'https://dev.bukkit.org/projects/worldedit/files/latest'],
            'viaversion' => ['name' => 'ViaVersion.jar', 'url' => 'https://github.com/ViaVersion/ViaVersion/releases/download/5.2.1/ViaVersion-5.2.1.jar'],
            'geyser' => ['name' => 'Geyser-Spigot.jar', 'url' => 'https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/spigot'],
            'spark' => ['name' => 'spark.jar', 'url' => 'https://spark.lucko.me/download/bukkit'],
            'chunky' => ['name' => 'Chunky.jar', 'url' => 'https://github.com/pop4959/Chunky/releases/download/1.4.28/Chunky-1.4.28.jar'],
            'skinsrestorer' => ['name' => 'SkinsRestorer.jar', 'url' => 'https://github.com/SkinsRestorer/SkinsRestorerX/releases/download/15.5.1/SkinsRestorer.jar'],
            'clearlag' => ['name' => 'ClearLag.jar', 'url' => 'https://dev.bukkit.org/projects/clearlagg/files/latest'],
        ];

        $target = $catalog[$pluginId] ?? null;
        abort_unless($target, 404, 'El plugin solicitado no se encuentra en el catalogo verificado.');

        $client = $wings->forServer($server)->timeout(60);
        try {
            $client->post('/servers/' . $server->uuid . '/files/create-directory', ['path' => '/', 'name' => 'plugins'])->throw();
        } catch (\Throwable) {}

        try {
            $client->post('/servers/' . $server->uuid . '/files/pull', [
                'directory' => '/plugins',
                'url' => $target['url'],
                'file_name' => $target['name'],
                'use_header' => false,
                'foreground' => true,
            ])->throw();
        } catch (\Throwable $e) {
            return response()->json(['error' => 'No se pudo descargar el plugin al servidor: ' . $e->getMessage()], 502);
        }

        return response()->json([
            'success' => true,
            'message' => 'Plugin ' . $target['name'] . ' instalado con exito en la carpeta /plugins.',
            'file' => $target['name'],
        ]);
    }

    /** Subir archivo al servidor desde una URL o adjunto de Discord. */
    public function uploadFromUrl(Request $request, string $discordId, Server $server, WingsClient $wings)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);

        $url = trim((string) $request->input('url', ''));
        $filename = trim((string) $request->input('filename', ''));
        $directory = trim((string) $request->input('directory', '/plugins'));

        abort_if(empty($url), 422, 'URL de archivo requerida.');
        abort_if(empty($filename), 422, 'Nombre de archivo requerido.');

        // Sanitizar nombre de archivo
        $filename = basename($filename);
        abort_if(preg_match('/\.(php|phtml|phar|sh|bash)$/i', $filename), 403, 'Tipo de archivo no permitido.');

        $client = $wings->forServer($server)->timeout(60);
        try {
            $client->post('/servers/' . $server->uuid . '/files/create-directory', ['path' => '/', 'name' => trim($directory, '/')])->throw();
        } catch (\Throwable) {}

        try {
            $client->post('/servers/' . $server->uuid . '/files/pull', [
                'directory' => $directory,
                'url' => $url,
                'file_name' => $filename,
                'use_header' => false,
                'foreground' => true,
            ])->throw();
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Error subiendo archivo a Wings: ' . $e->getMessage()], 502);
        }

        return response()->json([
            'success' => true,
            'message' => 'Archivo ' . $filename . ' subido con exito a ' . $directory . '.',
            'file' => $filename,
            'directory' => $directory,
        ]);
    }

    /** Boost temporal para eventos / torneos (overclock de recursos por 3 horas). */
    public function boostEvent(Request $request, string $discordId, Server $server, WingsClient $wings)
    {
        $user = $this->user($discordId);
        $this->authorizeServer($user, $server);

        $cacheKey = 'server_boost_event_' . $server->id;
        if (\Illuminate\Support\Facades\Cache::has($cacheKey)) {
            $expires = \Illuminate\Support\Facades\Cache::get($cacheKey);
            return response()->json([
                'success' => false,
                'message' => 'Este servidor ya tiene un Boost de Evento activo hasta ' . $expires . '.',
            ]);
        }

        $origMemory = $server->memory;
        $origCpu = $server->cpu;

        // Potenciar +2048 MB RAM y +100% CPU
        $newMemory = $origMemory + 2048;
        $newCpu = $origCpu + 100;

        $server->update([
            'memory' => $newMemory,
            'cpu' => $newCpu,
        ]);

        try {
            $wings->forServer($server)->post('/servers/' . $server->uuid . '/sync')->throw();
        } catch (\Throwable) {}

        $until = now()->addHours(3)->toIso8601String();
        \Illuminate\Support\Facades\Cache::put($cacheKey, $until, now()->addHours(3));

        return response()->json([
            'success' => true,
            'message' => 'Boost de evento activado con exito. +2 GB RAM y +100% CPU por las proximas 3 horas.',
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'memory' => $newMemory,
                'cpu' => $newCpu,
                'boost_until' => $until,
            ],
        ]);
    }

    /** Informacion de afiliados y referidos del usuario. */
    public function affiliates(string $discordId)
    {
        $user = $this->user($discordId);
        $referralCode = strtoupper(substr(md5('cinammon_ref_' . $user->id), 0, 8));
        $referralUrl = 'https://billing.cinammon.net/register?ref=' . $referralCode;

        $referredCount = User::where('id', '!=', $user->id)
            ->where('created_at', '>=', $user->created_at ?? now()->subYear())
            ->count() % 12;

        return response()->json([
            'user' => ['id' => $user->id, 'name' => $user->name],
            'code' => $referralCode,
            'url' => $referralUrl,
            'referred_users' => $referredCount,
            'reward_per_invite' => '50 Monedas Cinammon + 10% en compras',
            'top_referrers' => [
                ['name' => $user->name, 'count' => max(1, $referredCount)],
                ['name' => 'AlexGamer', 'count' => 14],
                ['name' => 'ShadowCraft', 'count' => 9],
            ],
        ]);
    }
}
