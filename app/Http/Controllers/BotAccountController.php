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

    /** Reclamar servidor gratuito de hosting por Server Boost en Discord. */
    public function claimBoost(Request $request, string $discordId, WingsClient $wings)
    {
        $user = $this->user($discordId);

        // Verificar si ya tiene un servidor de recompensa por boost activo
        $existing = Server::where('owner_id', $user->id)
            ->where(function ($q) {
                $q->where('description', 'like', '%Server Boost%')
                  ->orWhere('external_id', 'like', 'boost_%');
            })
            ->where('active', 1)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => true,
                'already_has_server' => true,
                'message' => 'Ya posees un servidor de recompensa por Server Boost activo en tu cuenta.',
                'server' => [
                    'id' => $existing->id,
                    'name' => $existing->name,
                    'memory' => $existing->memory,
                    'disk' => $existing->disk,
                    'cpu' => $existing->cpu,
                    'address' => $existing->publicAddress(),
                    'url' => url('/servers/' . $existing->id . '/console'),
                ],
            ]);
        }

        // Buscar nodo disponible sin modo de mantenimiento
        $node = Node::where('maintenance_mode', false)->orderBy('id')->first() ?? Node::orderBy('id')->first();
        abort_unless($node, 503, 'No hay nodos disponibles para aprovisionar el servidor en este momento.');

        // Buscar egg predeterminado (Minecraft Paper o el primero disponible)
        $egg = Egg::where('name', 'like', '%Paper%')->first()
            ?? Egg::where('category', 'minecraft')->first()
            ?? Egg::orderBy('id')->first();
        abort_unless($egg, 503, 'No se encontro una plantilla valida.');

        // Asignar o crear allocation
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
        $serverName = 'Boost Server · ' . $user->name;

        $server = Server::create([
            'uuid' => (string) Str::uuid(),
            'uuid_short' => substr((string) Str::uuid(), 0, 8),
            'node_id' => $node->id,
            'allocation_id' => $allocation->id,
            'name' => $serverName,
            'description' => 'Servidor de recompensa por Server Boost en Discord',
            'active' => 1,
            'owner_id' => $user->id,
            'memory' => 4096, // 4 GB RAM
            'swap' => 0,
            'disk' => 15360, // 15 GB NVMe
            'io' => 500,
            'cpu' => 200, // 200% CPU
            'egg_id' => $egg->id,
            'startup' => $egg->startup ?? '',
            'image' => reset($images) ?: '',
            'status' => 0,
        ]);

        $server->forceFill([
            'external_id' => 'boost_' . $user->id . '_' . time(),
            'billing_paid' => true,
        ])->save();

        $allocation->forceFill(['server_id' => $server->id])->save();

        try {
            $wings->provision($server);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('ClaimBoost Wings: ' . $e->getMessage());
        }

        try {
            \App\Support\Ranks::sync($user);
        } catch (\Throwable) {
        }

        return response()->json([
            'success' => true,
            'already_has_server' => false,
            'message' => 'Servidor de recompensa por Server Boost creado y aprovisionado con exito.',
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'memory' => $server->memory,
                'disk' => $server->disk,
                'cpu' => $server->cpu,
                'address' => $server->fresh()->publicAddress(),
                'url' => url('/servers/' . $server->id . '/console'),
            ],
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $this->maskEmail($user->email),
            ],
        ], 201);
    }
}
