<?php

namespace App\Http\Controllers;

use App\Services\Daemon\ServerConfiguration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DaemonController extends Controller
{
    private function server(Request $request, string $uuid)
    {
        return $request->attributes->get('node')->servers()->where('uuid', $uuid)->firstOrFail();
    }

    public function servers(Request $request, ServerConfiguration $configuration)
    {
        $page = $request->attributes->get('node')->servers()->with(['egg.variables', 'allocation'])
            ->paginate(min(100, max(1, $request->integer('per_page', 50))));
        return response()->json([
            'data' => $page->getCollection()->map(fn ($server) => $configuration->forServer($server)),
            'meta' => [
                'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(), 'total' => $page->total(),
                'from' => $page->firstItem() ?? 0, 'to' => $page->lastItem() ?? 0,
            ],
        ]);
    }

    public function configuration(Request $request, string $uuid, ServerConfiguration $configuration)
    {
        return response()->json($configuration->forServer($this->server($request, $uuid)));
    }

    public function installScript(Request $request, string $uuid)
    {
        $egg = $this->server($request, $uuid)->egg;
        return response()->json([
            'container_image' => $egg->script_container,
            'entrypoint' => $egg->script_entry,
            'script' => $egg->script_install,
        ]);
    }

    public function installed(Request $request, string $uuid)
    {
        $data = $request->validate(['successful' => 'required|boolean', 'reinstall' => 'sometimes|boolean']);
        $this->server($request, $uuid)->forceFill([
            'installed_at' => $data['successful'] ? now() : null,
            'status' => false,
        ])->save();
        return response()->noContent();
    }

    public function state(Request $request, string $uuid)
    {
        $data = $request->validate(['data.new_state' => 'required|in:offline,starting,running,stopping', 'data.previous_state' => 'sometimes|string']);
        $this->server($request, $uuid)->update(['status' => $data['data']['new_state'] === 'running']);
        return response()->noContent();
    }

    public function reset(Request $request)
    {
        $request->attributes->get('node')->servers()->update(['status' => false]);
        return response()->noContent();
    }

    public function activity(Request $request)
    {
        $data = $request->validate(['data' => 'present|array|max:100']);
        if ($data['data']) {
            Log::channel('single')->info('Wings activity', ['node_id' => $request->attributes->get('node')->id, 'events' => $data['data']]);
            foreach ($data['data'] as $event) {
                $serverUuid = $event['server'] ?? null;
                $eventName = $event['event'] ?? '';
                if ($serverUuid) {
                    if (str_contains($eventName, 'crashed') || str_contains($eventName, 'stop') || str_contains($eventName, 'kill')) {
                        \App\Models\Server::where('uuid', $serverUuid)->update(['status' => 0]);
                    } elseif (str_contains($eventName, 'start') || str_contains($eventName, 'power:start') || str_contains($eventName, 'running')) {
                        \App\Models\Server::where('uuid', $serverUuid)->update(['status' => 1]);
                    }
                }
            }
        }
        return response()->noContent();
    }

    /**
     * Valida un inicio de sesión SFTP con las credenciales generadas por el panel
     * (una por persona y servidor). La contraseña de la cuenta ya no abre el SFTP.
     */
    public function sftpAuth(Request $request)
    {
        $username = strtolower((string) $request->input('username', ''));
        $password = (string) $request->input('password', '');
        $ip = (string) preg_replace('/^\[?(.*?)\]?:\d+$/', '$1', (string) $request->input('ip', ''));
        $node = $request->attributes->get('node');

        if ($username === '' || $password === '' || $request->input('type', 'password') !== 'password') {
            return response()->json(['error' => 'Invalid credentials'], 403);
        }

        // Límites por usuario+IP, por usuario (aunque cambien de IP) y por IP (aunque cambien de usuario).
        $limits = [
            ["sftp:{$username}|{$ip}", 5, 900],
            ["sftp-user:{$username}", 10, 3600],
            ["sftp-ip:{$ip}", 30, 3600],
        ];
        foreach ($limits as [$key, $max]) {
            if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($key, $max)) {
                return response()->json(['error' => 'Too many attempts'], 429);
            }
        }

        $credential = \App\Models\SftpCredential::with(['server.owner', 'user'])->where('username', $username)->first();

        // Se compara siempre contra un hash para que el tiempo de respuesta no revele si el usuario existe.
        $hash = $credential?->password_hash
            ?? \Illuminate\Support\Facades\Cache::rememberForever('sftp.dummy_hash', fn () => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(32)));
        $valid = \Illuminate\Support\Facades\Hash::check($password, $hash) && $credential !== null;

        $server = $credential?->server;
        $user = $credential?->user;

        if ($valid) {
            $isOwner = $server && $user->id === $server->owner_id;
            $isSubuser = $server && $server->subusers()->where('user_id', $user->id)->exists();
            $isAdmin = $user->hasAnyRole(['Owner', 'Admin']);
            $lockedByOwner = $server && ! $isOwner && ! $isSubuser && $server->owner?->securityLockActive();

            // El acceso se vuelve a comprobar en cada conexión: servidor de este nodo, activo y la persona sigue autorizada.
            $valid = $server
                && (int) $server->node_id === (int) $node->id
                && $server->active
                && ($isOwner || $isSubuser || $isAdmin)
                && ! $lockedByOwner;
        }

        if (! $valid) {
            foreach ($limits as [$key, , $decay]) {
                \Illuminate\Support\Facades\RateLimiter::hit($key, $decay);
            }

            return response()->json(['error' => 'Invalid credentials'], 403);
        }

        \Illuminate\Support\Facades\RateLimiter::clear($limits[0][0]);
        $credential->forceFill(['last_used_at' => now(), 'last_used_ip' => $ip ?: null])->save();

        return response()->json([
            'server' => $server->uuid,
            'user' => (string) $user->id,
            'permissions' => ['*'],
        ]);
    }
}
