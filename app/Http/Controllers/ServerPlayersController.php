<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Services\Daemon\WingsClient;
use App\Support\MinecraftAddons;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Operadores, whitelist y baneos de los servidores de Minecraft Java.
 * Las listas se leen de ops.json, whitelist.json, banned-players.json y banned-ips.json;
 * los cambios se envían como comandos de consola (op, whitelist add, ban...), así el propio
 * servidor resuelve los UUID y guarda los archivos.
 */
class ServerPlayersController extends Controller
{
    private const NAME = '/^[A-Za-z0-9_]{3,16}$/';

    private function authorizeServer(Request $request, Server $server): void
    {
        $user = $request->user();
        abort_unless(
            $user->id === $server->owner_id ||
            $user->hasAnyRole(['Owner', 'Admin']) ||
            $server->subusers()->where('user_id', $user->id)->exists(),
            403,
            'No tienes permiso para acceder a este servidor.'
        );
        abort_unless(MinecraftAddons::hasPlayerLists($server), 404, 'Este servidor no tiene lista de jugadores.');
    }

    private function json($client, Server $server, string $file): array
    {
        $response = $client->get('/servers/'.$server->uuid.'/files/contents', ['file' => '/'.$file]);
        if (! $response->successful()) {
            return [];
        }
        $data = json_decode($response->body(), true);

        return is_array($data) ? $data : [];
    }

    public function index(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        try {
            $client = $wings->forServer($server)->timeout(10);
            $props = $client->get('/servers/'.$server->uuid.'/files/contents', ['file' => '/server.properties']);
            $whitelistOn = $props->successful() && preg_match('/^white-list\s*=\s*true\s*$/mi', $props->body()) === 1;
            $enforce = $props->successful() && preg_match('/^enforce-whitelist\s*=\s*true\s*$/mi', $props->body()) === 1;

            $player = fn ($e) => ['name' => (string) ($e['name'] ?? ''), 'uuid' => (string) ($e['uuid'] ?? '')];
            $ban = fn ($e) => [
                'name' => (string) ($e['name'] ?? $e['ip'] ?? ''),
                'reason' => Str::limit((string) ($e['reason'] ?? ''), 120, '…'),
                'source' => (string) ($e['source'] ?? ''),
                'created' => (string) ($e['created'] ?? ''),
                'expires' => (string) ($e['expires'] ?? 'forever'),
            ];

            return response()->json([
                'ops' => collect($this->json($client, $server, 'ops.json'))->map(fn ($e) => $player($e) + ['level' => (int) ($e['level'] ?? 4)])->values(),
                'whitelist' => collect($this->json($client, $server, 'whitelist.json'))->map($player)->values(),
                'whitelist_enabled' => $whitelistOn,
                'whitelist_enforced' => $enforce,
                'banned' => collect($this->json($client, $server, 'banned-players.json'))->map($ban)->values(),
                'banned_ips' => collect($this->json($client, $server, 'banned-ips.json'))->map($ban)->values(),
            ]);
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo conectar con el nodo.'], 502);
        }
    }

    public function action(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $data = $request->validate([
            'action' => 'required|in:op,deop,whitelist_add,whitelist_remove,whitelist_on,whitelist_off,ban,pardon,ban_ip,pardon_ip,kick',
            'target' => 'nullable|string|max:45',
            'reason' => 'nullable|string|max:100',
        ]);
        $action = $data['action'];
        $target = trim((string) ($data['target'] ?? ''));
        // El motivo va al final del comando: sin saltos de línea ni caracteres de control.
        $reason = trim(preg_replace('/[\x00-\x1f\x7f]+/', ' ', (string) ($data['reason'] ?? '')));

        if (in_array($action, ['ban_ip', 'pardon_ip'], true)) {
            abort_unless(filter_var($target, FILTER_VALIDATE_IP) || preg_match(self::NAME, $target), 422, 'Escribe una IP o un nombre de jugador válido.');
        } elseif (! in_array($action, ['whitelist_on', 'whitelist_off'], true)) {
            abort_unless(preg_match(self::NAME, $target), 422, 'Nombre de jugador no válido (3-16 letras, números o _).');
        }

        $command = match ($action) {
            'op' => "op {$target}",
            'deop' => "deop {$target}",
            'whitelist_add' => "whitelist add {$target}",
            'whitelist_remove' => "whitelist remove {$target}",
            'whitelist_on' => 'whitelist on',
            'whitelist_off' => 'whitelist off',
            'ban' => trim("ban {$target} {$reason}"),
            'pardon' => "pardon {$target}",
            'ban_ip' => trim("ban-ip {$target} {$reason}"),
            'pardon_ip' => "pardon-ip {$target}",
            'kick' => trim("kick {$target} {$reason}"),
        };

        try {
            $state = $wings->forServer($server)->timeout(5)->get('/servers/'.$server->uuid)->throw()->json('state');
            abort_unless($state === 'running', 409, 'Enciende el servidor para gestionar jugadores.');
            $wings->forServer($server)->post('/servers/'.$server->uuid.'/commands', ['commands' => [$command]])->throw();
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo enviar el comando al servidor.'], 502);
        }

        $user = $request->user();
        $key = "server_activity_{$server->id}";
        $activity = Cache::get($key, []);
        array_unshift($activity, [
            'id' => (string) Str::uuid(),
            'user' => ['name' => $user->name, 'email' => $user->email, 'avatar' => $user->avatar ?? null],
            'action' => 'players:'.$action,
            'description' => 'Ejecutó /'.$command,
            'ip' => $request->ip(),
            'created_at' => now()->toIso8601String(),
        ]);
        Cache::forever($key, array_slice($activity, 0, 50));

        return response()->json(['command' => $command]);
    }
}
