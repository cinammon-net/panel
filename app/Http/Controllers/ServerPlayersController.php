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

    public function page(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        return \Inertia\Inertia::render('Servers/People', [
            'server' => ['id' => $server->id, 'name' => $server->name, 'owner_id' => $server->owner_id, 'egg' => $server->egg?->name],
        ]);
    }

    /** Lista de un directorio del servidor ([] si no existe). */
    private function dir($client, Server $server, string $path): array
    {
        $response = $client->get('/servers/'.$server->uuid.'/files/list-directory', ['directory' => '/'.$path]);

        return $response->successful() ? (array) ($response->json() ?? []) : [];
    }

    /** Primer directorio que exista de los candidatos (formato 26.x world/players/... o antiguo world/...). */
    private function firstDir($client, Server $server, array $candidates): array
    {
        foreach ($candidates as $path) {
            $entries = $this->dir($client, $server, $path);
            if ($entries !== []) {
                return [$path, $entries];
            }
        }

        return [null, []];
    }

    /**
     * Todos los jugadores que han entrado alguna vez: nombre, última conexión, OP/whitelist/baneo,
     * conectado ahora y estadísticas (tiempo jugado, muertes, kills, bloques minados, distancia, logros).
     */
    public function roster(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);

        try {
            $data = Cache::remember('mc_roster:'.$server->id, now()->addSeconds(30), function () use ($wings, $server) {
                $client = $wings->forServer($server)->timeout(15);
                $props = $client->get('/servers/'.$server->uuid.'/files/contents', ['file' => '/server.properties']);
                $level = $props->successful() && preg_match('/^level-name\s*=\s*(.+)$/m', $props->body(), $m) ? trim($m[1]) : 'world';
                if (! preg_match('/^[A-Za-z0-9_. -]{1,64}$/', $level) || str_contains($level, '..')) {
                    $level = 'world';
                }

                $names = [];
                foreach ($this->json($client, $server, 'usercache.json') as $e) {
                    if (isset($e['uuid'], $e['name'])) {
                        $names[strtolower($e['uuid'])] = ['name' => (string) $e['name'], 'expires' => $e['expiresOn'] ?? null];
                    }
                }
                $ops = collect($this->json($client, $server, 'ops.json'))->keyBy(fn ($e) => strtolower((string) ($e['uuid'] ?? '')));
                $white = collect($this->json($client, $server, 'whitelist.json'))->keyBy(fn ($e) => strtolower((string) ($e['uuid'] ?? '')));
                $banned = collect($this->json($client, $server, 'banned-players.json'))->keyBy(fn ($e) => strtolower((string) ($e['uuid'] ?? '')));

                [, $dataFiles] = $this->firstDir($client, $server, ["{$level}/players/data", "{$level}/playerdata"]);
                [$statsPath, $statsFiles] = $this->firstDir($client, $server, ["{$level}/players/stats", "{$level}/stats"]);
                [$advPath, $advFiles] = $this->firstDir($client, $server, ["{$level}/players/advancements", "{$level}/advancements"]);

                $uuidOf = fn ($name) => preg_match('/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(dat|json)$/i', (string) $name, $m) ? strtolower($m[1]) : null;
                $seen = [];
                foreach ([$dataFiles, $statsFiles] as $list) {
                    foreach ($list as $e) {
                        if (($uuid = $uuidOf($e['name'] ?? '')) && ! empty($e['modified'])) {
                            $seen[$uuid] = max($seen[$uuid] ?? '', (string) $e['modified']);
                        }
                    }
                }
                $statsSet = collect($statsFiles)->map(fn ($e) => $uuidOf($e['name'] ?? ''))->filter()->flip();
                $advSet = collect($advFiles)->map(fn ($e) => $uuidOf($e['name'] ?? ''))->filter()->flip();

                $uuids = collect(array_keys($names))->merge(array_keys($seen))->merge($ops->keys())->merge($banned->keys())->filter()->unique();
                $players = $uuids->map(function ($uuid) use ($names, $seen, $ops, $white, $banned) {
                    $lastSeen = $seen[$uuid] ?? null;
                    if (! $lastSeen && isset($names[$uuid]['expires'])) {
                        try {
                            $lastSeen = \Illuminate\Support\Carbon::parse($names[$uuid]['expires'])->subMonth()->toIso8601String();
                        } catch (\Throwable $e) {
                        }
                    }

                    return [
                        'uuid' => $uuid,
                        'name' => $names[$uuid]['name'] ?? $ops[$uuid]['name'] ?? $white[$uuid]['name'] ?? $banned[$uuid]['name'] ?? substr($uuid, 0, 8),
                        'last_seen' => $lastSeen,
                        'op' => $ops->has($uuid),
                        'op_level' => $ops->has($uuid) ? (int) ($ops[$uuid]['level'] ?? 4) : null,
                        'whitelisted' => $white->has($uuid),
                        'banned' => $banned->has($uuid),
                        'ban_reason' => $banned->has($uuid) ? Str::limit((string) ($banned[$uuid]['reason'] ?? ''), 120, '…') : null,
                        'stats' => null,
                    ];
                })->sortByDesc(fn ($p) => $p['last_seen'] ?? '')->values()->all();

                // Estadísticas de los 150 más recientes (un archivo por jugador).
                foreach (array_slice(array_keys($players), 0, 150) as $i) {
                    $uuid = $players[$i]['uuid'];
                    if ($statsPath && $statsSet->has($uuid)) {
                        $st = $this->json($client, $server, "{$statsPath}/{$uuid}.json")['stats'] ?? [];
                        $c = $st['minecraft:custom'] ?? [];
                        $distance = 0;
                        foreach ($c as $k => $v) {
                            if (str_ends_with($k, '_one_cm')) {
                                $distance += (int) $v;
                            }
                        }
                        $players[$i]['stats'] = [
                            'play_ticks' => (int) ($c['minecraft:play_time'] ?? $c['minecraft:play_one_minute'] ?? 0),
                            'deaths' => (int) ($c['minecraft:deaths'] ?? 0),
                            'mob_kills' => (int) ($c['minecraft:mob_kills'] ?? 0),
                            'player_kills' => (int) ($c['minecraft:player_kills'] ?? 0),
                            'sessions' => (int) ($c['minecraft:leave_game'] ?? 0),
                            'jumps' => (int) ($c['minecraft:jump'] ?? 0),
                            'distance_m' => (int) round($distance / 100),
                            'mined' => (int) array_sum(array_map('intval', $st['minecraft:mined'] ?? [])),
                            'placed' => (int) array_sum(array_map('intval', $st['minecraft:used'] ?? [])),
                            'advancements' => null,
                        ];
                    }
                    if ($advPath && $advSet->has($uuid)) {
                        $adv = $this->json($client, $server, "{$advPath}/{$uuid}.json");
                        $done = collect($adv)->filter(fn ($v, $k) => is_array($v) && ($v['done'] ?? false) && ! str_contains((string) $k, ':recipes/'))->count();
                        $players[$i]['stats'] ??= [];
                        $players[$i]['stats']['advancements'] = $done;
                    }
                }

                return ['players' => $players, 'level' => $level, 'whitelist_enabled' => $props->successful() && preg_match('/^white-list\s*=\s*true\s*$/mi', $props->body()) === 1];
            });
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo conectar con el nodo.'], 502);
        }

        $ping = \App\Support\MinecraftPing::forServer($server);
        $online = collect($ping['players'] ?? [])->pluck('name')->map(fn ($n) => strtolower($n))->all();
        $players = array_map(fn ($p) => $p + ['online' => in_array(strtolower($p['name']), $online, true)], $data['players']);

        return response()->json([
            'players' => $players,
            'online' => $ping ? ['online' => $ping['online'], 'max' => $ping['max']] : null,
            'whitelist_enabled' => (bool) ($data['whitelist_enabled'] ?? false),
        ]);
    }

    /** Jugadores conectados ahora mismo (Server List Ping). */
    public function online(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);
        $ping = \App\Support\MinecraftPing::forServer($server);

        return response()->json($ping ? ['reachable' => true] + $ping : ['reachable' => false, 'online' => 0, 'max' => 0, 'players' => []]);
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
