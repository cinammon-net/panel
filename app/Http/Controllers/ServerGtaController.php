<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Services\Daemon\WingsClient;
use App\Support\GtaServers;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Jugadores conectados y mods/resources de los servidores de GTA (MTA, SA-MP, open.mp, FiveM, RedM, alt:V, RAGE...).
 */
class ServerGtaController extends Controller
{
    private function authorizeServer(Request $request, Server $server): string
    {
        $user = $request->user();
        abort_unless(
            $user->id === $server->owner_id ||
            $user->hasAnyRole(['Owner', 'Admin']) ||
            $server->subusers()->where('user_id', $user->id)->exists(),
            403,
            'No tienes permiso para acceder a este servidor.'
        );
        $kind = GtaServers::kind($server);
        abort_unless($kind !== null, 404, 'Esta sección solo existe en servidores de GTA.');

        return $kind;
    }

    /** Páginas del menú lateral: Jugadores (/gta-players) y Resources/Mods (/gta-mods). */
    public function page(Request $request, Server $server)
    {
        $kind = $this->authorizeServer($request, $server);

        return \Inertia\Inertia::render('Servers/Gta', [
            'server' => ['id' => $server->id, 'name' => $server->name, 'owner_id' => $server->owner_id, 'egg' => $server->egg?->name, 'kind' => $kind],
            'view' => str_ends_with($request->path(), 'gta-mods') ? 'mods' : 'online',
        ]);
    }

    /** Jugadores conectados ahora mismo. */
    public function online(Request $request, Server $server)
    {
        $kind = $this->authorizeServer($request, $server);
        $live = GtaServers::hasLivePlayers($server);
        $data = $live ? GtaServers::query($server) : null;

        return response()->json([
            'kind' => $kind,
            'supported' => $live,
            'actions' => GtaServers::actions($kind),
            'reachable' => $data !== null,
        ] + ($data ?? ['online' => 0, 'max' => 0, 'players' => [], 'hostname' => null, 'gamemode' => null, 'map' => null, 'version' => null]));
    }

    private function dir($client, Server $server, string $path): array
    {
        $response = $client->get('/servers/'.$server->uuid.'/files/list-directory', ['directory' => '/'.$path]);

        return $response->successful() ? array_values(array_filter((array) ($response->json() ?? []), 'is_array')) : [];
    }

    private function file($client, Server $server, string $path): string
    {
        $response = $client->get('/servers/'.$server->uuid.'/files/contents', ['file' => '/'.$path]);

        return $response->successful() ? mb_substr($response->body(), 0, 512 * 1024) : '';
    }

    /** Mods/resources instalados, con si están activados en la configuración. */
    public function mods(Request $request, Server $server, WingsClient $wings)
    {
        $kind = $this->authorizeServer($request, $server);

        try {
            $data = Cache::remember('gta_mods:'.$server->id, now()->addSeconds(20), function () use ($wings, $server, $kind) {
                $client = $wings->forServer($server)->timeout(10);
                $configPath = GtaServers::configFile($kind);
                $config = $configPath ? $this->file($client, $server, $configPath) : '';
                $json = $kind === 'samp' ? $this->file($client, $server, 'config.json') : null;
                $enabled = GtaServers::enabledFromConfig($kind, $config, $json);
                if ($enabled !== null && $config === '' && ! $json) {
                    $enabled = null; // sin archivo de configuración no se sabe qué está activado
                }

                $items = [];
                $seenFolders = [];
                foreach (GtaServers::modFolders($kind) as [$folder, $label]) {
                    $entries = $this->dir($client, $server, $folder);
                    if ($entries === [] || isset($seenFolders[$label])) {
                        continue;
                    }
                    $seenFolders[$label] = true;
                    $this->collect($client, $server, $kind, $folder, $label, null, $entries, $enabled, $items, 0);
                }

                $this->decorate($server, $kind, $items);

                usort($items, fn ($a, $b) => [$b['enabled'] === true, $a['group'] ?? '', strtolower($a['name'])] <=> [$a['enabled'] === true, $b['group'] ?? '', strtolower($b['name'])]);

                return [
                    'kind' => $kind,
                    'config' => $configPath,
                    'known' => $enabled !== null,
                    'items' => array_slice($items, 0, 800),
                    'total' => count($items),
                ];
            });
        } catch (ConnectionException|RequestException) {
            return response()->json(['message' => 'No se pudo leer el servidor.'], 502);
        }

        return response()->json($data);
    }

    private const ICON = '/^(?:icon|logo|preview|thumbnail|thumb|banner|[a-z0-9_-]*icon|[a-z0-9_-]*logo)\.(png|jpe?g|webp|gif)$/i';

    /** Cliente HTTP de Wings dentro de un pool (mismas credenciales que WingsClient). */
    private function poolRequest(Pool $pool, Server $server, string $key)
    {
        $node = $server->node;
        $scheme = $node->scheme === 'http' ? 'http' : 'https';

        return $pool->as($key)->baseUrl("{$scheme}://{$node->fqdn}:{$node->daemon_listen}/api")
            ->withToken($node->daemon_token)->acceptJson()->connectTimeout(5)->timeout(15);
    }

    /**
     * Icono y datos (nombre, autor, versión, descripción) de cada resource que sea una carpeta.
     * MTA los declara en meta.xml (<info .../>) y FiveM/RedM en fxmanifest.lua. Se consultan en paralelo
     * y se guardan 10 minutos (se renuevan si cambia algún resource).
     */
    private function decorate(Server $server, string $kind, array &$items): void
    {
        $folders = array_values(array_filter(array_keys($items), fn ($i) => $items[$i]['type'] === 'folder'));
        $folders = array_slice($folders, 0, 400);
        if ($folders === []) {
            return;
        }
        $manifests = match ($kind) {
            'mta', 'gtac' => ['meta.xml'],
            'cfx' => ['fxmanifest.lua', '__resource.lua'],
            'altv' => ['resource.toml', 'resource.cfg'],
            default => [],
        };
        $signature = md5(implode('|', array_map(fn ($i) => $items[$i]['path'].'@'.($items[$i]['modified'] ?? ''), $folders)));

        $meta = Cache::remember("gta_mod_meta:{$server->id}:{$signature}", now()->addMinutes(10), function () use ($server, $items, $folders, $manifests) {
            $out = [];
            foreach (array_chunk($folders, 25) as $chunk) {
                $lists = Http::pool(fn (Pool $pool) => array_map(
                    fn ($i) => $this->poolRequest($pool, $server, (string) $i)->get('/servers/'.$server->uuid.'/files/list-directory', ['directory' => '/'.$items[$i]['path']]),
                    $chunk
                ));
                $reads = [];
                foreach ($chunk as $i) {
                    $res = $lists[(string) $i] ?? null;
                    $names = $res instanceof \Illuminate\Http\Client\Response && $res->successful()
                        ? array_map(fn ($e) => (string) ($e['name'] ?? ''), array_filter((array) $res->json(), fn ($e) => is_array($e) && ($e['file'] ?? true)))
                        : [];
                    $icon = collect($names)->first(fn ($n) => preg_match(self::ICON, $n));
                    $manifest = collect($manifests)->first(fn ($m) => in_array($m, $names, true));
                    $out[$i] = ['icon' => $icon ? $items[$i]['path'].'/'.$icon : null, 'info' => null];
                    if ($manifest) {
                        $reads[$i] = $items[$i]['path'].'/'.$manifest;
                    }
                }
                if ($reads !== []) {
                    $files = Http::pool(fn (Pool $pool) => array_map(
                        fn ($i) => $this->poolRequest($pool, $server, (string) $i)->get('/servers/'.$server->uuid.'/files/contents', ['file' => '/'.$reads[$i]]),
                        array_keys($reads)
                    ));
                    foreach (array_keys($reads) as $i) {
                        $res = $files[(string) $i] ?? null;
                        if ($res instanceof \Illuminate\Http\Client\Response && $res->successful()) {
                            $out[$i]['info'] = self::manifestInfo(substr($res->body(), 0, 64 * 1024));
                        }
                    }
                }
            }

            return $out;
        });

        foreach ($meta as $i => $m) {
            if (! isset($items[$i])) {
                continue;
            }
            $items[$i]['icon'] = $m['icon'] ?? null;
            $items[$i]['title'] = $m['info']['name'] ?? null;
            $items[$i]['author'] = $m['info']['author'] ?? null;
            $items[$i]['version'] = $m['info']['version'] ?? null;
            $items[$i]['description'] = $m['info']['description'] ?? null;
        }
    }

    /** Nombre, autor, versión y descripción de meta.xml (MTA) o fxmanifest.lua (FiveM). */
    private static function manifestInfo(string $text): ?array
    {
        $info = [];
        if (preg_match('/<info\b([^>]*)>/i', $text, $m)) {
            preg_match_all('/(\w+)\s*=\s*"([^"]*)"/', $m[1], $attrs, PREG_SET_ORDER);
            foreach ($attrs as [, $key, $value]) {
                $info[strtolower($key)] = $value;
            }
        } else {
            preg_match_all('/^\s*(name|author|version|description)\s*[ (]?\s*["\']([^"\']*)["\']/mi', $text, $rows, PREG_SET_ORDER);
            foreach ($rows as [, $key, $value]) {
                $info[strtolower($key)] ??= $value;
            }
        }
        $clean = fn ($v) => ($v = trim(html_entity_decode(preg_replace('/#[0-9a-f]{6}|\^[0-9]/i', '', (string) $v)))) === '' ? null : mb_substr($v, 0, 160);
        $out = array_map($clean, array_intersect_key($info, array_flip(['name', 'author', 'version', 'description'])));

        return array_filter($out) ?: null;
    }

    /** Sirve el icono de un resource (solo imágenes dentro de las carpetas de mods). */
    public function icon(Request $request, Server $server, WingsClient $wings)
    {
        $kind = $this->authorizeServer($request, $server);
        $path = trim((string) $request->query('path'), '/');
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $inside = collect(GtaServers::modFolders($kind))->contains(fn ($f) => str_starts_with($path, $f[0].'/'));
        abort_unless($inside && ! str_contains($path, '..') && preg_match(self::ICON, basename($path)), 404);

        try {
            $res = $wings->forServer($server)->timeout(10)->get('/servers/'.$server->uuid.'/files/contents', ['file' => '/'.$path]);
        } catch (ConnectionException) {
            abort(502);
        }
        abort_unless($res->successful() && strlen($res->body()) <= 2 * 1024 * 1024, 404);
        $type = ['png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'webp' => 'image/webp', 'gif' => 'image/gif'][$ext];

        return response($res->body(), 200, [
            'Content-Type' => $type,
            'Cache-Control' => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'",
        ]);
    }

    /**
     * Recorre una carpeta de mods. Las carpetas entre corchetes ([admin], [gameplay]...) son grupos
     * en MTA y FiveM: se abren (hasta dos niveles) y sus resources se muestran con el grupo.
     */
    private function collect($client, Server $server, string $kind, string $path, string $label, ?string $group, array $entries, ?array $enabled, array &$items, int $depth): void
    {
        foreach ($entries as $e) {
            $name = (string) ($e['name'] ?? '');
            if ($name === '' || str_starts_with($name, '.') || count($items) >= 1000) {
                continue;
            }
            $isDir = (bool) ($e['directory'] ?? false) || (! ($e['file'] ?? true) && ! ($e['symlink'] ?? false));

            if ($isDir && preg_match('/^\[.+\]$/', $name)) {
                if ($depth < 2 && in_array($kind, ['mta', 'cfx', 'altv', 'gtac'], true)) {
                    $this->collect($client, $server, $kind, $path.'/'.$name, $label, trim(($group ? $group.' / ' : '').trim($name, '[]')), $this->dir($client, $server, $path.'/'.$name), $enabled, $items, $depth + 1);
                }

                continue;
            }

            // Qué cuenta como mod en cada carpeta.
            $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            if (! $isDir) {
                $wanted = match (true) {
                    $kind === 'mta' => $ext === 'zip',
                    $kind === 'samp' && in_array($label, ['Gamemodes', 'Filterscripts'], true) => $ext === 'amx',
                    $kind === 'samp' => in_array($ext, ['so', 'dll'], true),
                    $kind === 'ragemp' => in_array($ext, ['js', 'cs', 'dll'], true),
                    default => false,
                };
                if (! $wanted) {
                    continue;
                }
            } elseif ($kind === 'samp') {
                continue; // en SA-MP los mods son archivos, no carpetas
            }

            $base = $isDir ? $name : preg_replace('/\.[^.]+$/', '', $name);
            $groupKey = $group ? strtolower('['.explode(' / ', $group)[0].']') : null;
            $items[] = [
                'name' => $base,
                'file' => $name,
                'path' => $path.'/'.$name,
                'section' => $label,
                'group' => $group,
                'type' => $isDir ? 'folder' : $ext,
                'size' => $isDir ? null : (int) ($e['size'] ?? 0),
                'modified' => $e['modified'] ?? null,
                'enabled' => $enabled === null ? null : (in_array(strtolower($base), $enabled, true) || ($groupKey && in_array($groupKey, $enabled, true))),
            ];
        }
    }

    /** Expulsar o banear a un jugador conectado (por consola). */
    public function action(Request $request, Server $server, WingsClient $wings)
    {
        $kind = $this->authorizeServer($request, $server);
        $data = $request->validate([
            'action' => 'required|in:kick,ban',
            'name' => 'required|string|max:64',
            'id' => 'nullable|integer|min:0|max:65535',
            'reason' => 'nullable|string|max:100',
        ]);
        abort_unless(in_array($data['action'], GtaServers::actions($kind), true), 422, 'Este juego no admite esa acción desde el panel.');

        // Nombre y motivo van a la consola: sin espacios en el nombre ni caracteres de control.
        $name = preg_replace('/[\x00-\x20\x7f]+/', '', (string) $data['name']);
        $reason = trim(preg_replace('/[\x00-\x1f\x7f]+/', ' ', (string) ($data['reason'] ?? '')));
        abort_if($name === '', 422, 'Nombre de jugador no válido.');
        $command = GtaServers::command($kind, $data['action'], $name, isset($data['id']) ? (int) $data['id'] : null, $reason);
        abort_unless($command !== null, 422, 'Falta el id del jugador.');

        try {
            $state = $wings->forServer($server)->timeout(5)->get('/servers/'.$server->uuid)->throw()->json('state');
            abort_unless($state === 'running', 409, 'Enciende el servidor para gestionar jugadores.');
            $wings->forServer($server)->post('/servers/'.$server->uuid.'/commands', ['commands' => [$command]])->throw();
        } catch (ConnectionException|RequestException) {
            return response()->json(['message' => 'No se pudo enviar el comando al servidor.'], 502);
        }
        Cache::forget('gta_query:'.$server->id);

        $user = $request->user();
        $key = "server_activity_{$server->id}";
        $activity = Cache::get($key, []);
        array_unshift($activity, [
            'id' => (string) Str::uuid(),
            'user' => ['name' => $user->name, 'email' => $user->email, 'avatar' => $user->avatar ?? null],
            'action' => 'players:'.$data['action'],
            'description' => 'Ejecutó '.$command,
            'ip' => $request->ip(),
            'created_at' => now()->toIso8601String(),
        ]);
        Cache::forever($key, array_slice($activity, 0, 50));

        return response()->json(['command' => $command]);
    }
}
