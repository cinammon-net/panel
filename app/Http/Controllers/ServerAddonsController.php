<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Services\Daemon\WingsClient;
use App\Support\MinecraftAddons;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;
use ZipArchive;

/**
 * Plugins y mods de los servidores de Minecraft (carpetas /plugins y /mods).
 * Lista los .jar, lee su nombre/versión/autores del descriptor interno (plugin.yml, fabric.mod.json,
 * mods.toml...) con caché, y permite activar/desactivar (renombrar a .jar.disabled), borrar y subir.
 */
class ServerAddonsController extends Controller
{
    private const FOLDERS = ['plugins', 'mods'];

    /** Tamaño máximo de un .jar que se descarga para leer sus metadatos. */
    private const META_MAX_BYTES = 40 * 1024 * 1024;

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
        abort_unless($server->egg?->category === 'minecraft', 404, 'Esta sección solo existe en servidores de Minecraft.');
    }

    /** Carpeta permitida para este tipo de servidor (Paper → plugins, Fabric → mods...). */
    private function folder(Server $server, string $folder): string
    {
        $allowed = MinecraftAddons::folders(MinecraftAddons::kind($server)) ?? self::FOLDERS;
        abort_unless(in_array($folder, $allowed, true), 422, 'Este tipo de servidor no usa la carpeta '.$folder.'.');

        return $folder;
    }

    /** Nombre de archivo de un addon: sin rutas y terminado en .jar o .jar.disabled. */
    private function jarName(string $name): string
    {
        abort_if(
            $name === '' || strlen($name) > 255 || str_contains($name, '/') || str_contains($name, '\\')
            || preg_match('/[\x00-\x1f\x7f]/', $name) || str_starts_with($name, '.')
            || ! preg_match('/\.jar(\.disabled)?$/i', $name),
            422,
            'Nombre de archivo no válido.'
        );

        return $name;
    }

    private function logActivity(Server $server, Request $request, string $action, string $description): void
    {
        $user = $request->user();
        $key = "server_activity_{$server->id}";
        $activity = Cache::get($key, []);
        array_unshift($activity, [
            'id' => (string) Str::uuid(),
            'user' => ['name' => $user->name, 'email' => $user->email, 'avatar' => $user->avatar ?? null],
            'action' => $action,
            'description' => $description,
            'ip' => $request->ip(),
            'created_at' => now()->toIso8601String(),
        ]);
        Cache::forever($key, array_slice($activity, 0, 50));
    }

    /** Entradas de /<folder> (null si la carpeta no existe o es un enlace simbólico). */
    private function folderEntries($client, Server $server, string $folder): ?array
    {
        $root = $client->get('/servers/'.$server->uuid.'/files/list-directory', ['directory' => '/'])->throw()->json() ?? [];
        $dir = collect($root)->firstWhere('name', $folder);
        if (! $dir || ! ($dir['directory'] ?? false) || ($dir['symlink'] ?? false)) {
            return null;
        }

        return $client->get('/servers/'.$server->uuid.'/files/list-directory', ['directory' => '/'.$folder])->throw()->json() ?? [];
    }

    private function metaKey(Server $server, string $folder, array $entry): string
    {
        $name = preg_replace('/\.disabled$/i', '', (string) $entry['name']);

        return 'addon_meta:'.$server->uuid.':'.md5($folder.'|'.$name.'|'.($entry['size'] ?? 0).'|'.($entry['modified'] ?? ''));
    }

    /** Nombre y versión deducidos del nombre del archivo, p. ej. "EssentialsX-2.20.1.jar". */
    private function guessFromFilename(string $file): array
    {
        $base = preg_replace('/\.jar(\.disabled)?$/i', '', $file);
        if (preg_match('/^(.*?)[-_ ]v?(\d+(?:\.\d+)+[^\s]*)$/i', $base, $m)) {
            return [trim(str_replace(['_', '-'], ' ', $m[1])) ?: $base, $m[2]];
        }

        return [str_replace('_', ' ', $base), null];
    }

    private function present(Server $server, string $folder, array $entry): array
    {
        $enabled = (bool) preg_match('/\.jar$/i', $entry['name']);
        [$guessName, $guessVersion] = $this->guessFromFilename($entry['name']);
        $meta = Cache::get($this->metaKey($server, $folder, $entry));

        return [
            'file' => $entry['name'],
            'folder' => $folder,
            'enabled' => $enabled,
            'size' => (int) ($entry['size'] ?? 0),
            'modified' => $entry['modified'] ?? null,
            'name' => $meta['name'] ?? $guessName,
            'version' => $meta['version'] ?? $guessVersion,
            'description' => $meta['description'] ?? null,
            'authors' => $meta['authors'] ?? [],
            'website' => $meta['website'] ?? null,
            'loader' => $meta['loader'] ?? null,
            'meta_loaded' => is_array($meta),
        ];
    }

    public function page(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        return Inertia::render('Servers/Addons', [
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'owner_id' => $server->owner_id,
                'egg' => $server->egg?->name,
            ],
            'kind' => MinecraftAddons::kind($server),
        ]);
    }

    public function listing(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $kind = MinecraftAddons::kind($server);
        $wanted = MinecraftAddons::folders($kind);
        try {
            $client = $wings->forServer($server)->timeout(10);
            $folders = [];
            foreach ($wanted ?? self::FOLDERS as $folder) {
                $entries = $this->folderEntries($client, $server, $folder);
                // Tipo conocido: la carpeta se muestra aunque aún no exista (se crea al subir).
                $entries ??= $wanted === null ? null : [];
                $folders[$folder] = $entries === null ? null : collect($entries)
                    ->filter(fn ($e) => ($e['file'] ?? ! ($e['directory'] ?? false)) && ! ($e['symlink'] ?? false)
                        && preg_match('/\.jar(\.disabled)?$/i', (string) ($e['name'] ?? '')))
                    ->map(fn ($e) => $this->present($server, $folder, $e))
                    ->sortBy(fn ($a) => strtolower($a['name']))
                    ->values()
                    ->all();
            }

            return response()->json(['kind' => $kind, 'folders' => (object) $folders]);
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo conectar con el nodo.'], 502);
        }
    }

    /** Lee los metadatos de un .jar (se descarga a un temporal y se guarda en caché 30 días). */
    public function meta(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $data = $request->validate(['folder' => 'required|string', 'file' => 'required|string|max:255']);
        $folder = $this->folder($server, $data['folder']);
        $file = $this->jarName($data['file']);

        try {
            $client = $wings->forServer($server)->timeout(60);
            $entry = collect($this->folderEntries($client, $server, $folder) ?? [])->firstWhere('name', $file);
            abort_unless($entry && ! ($entry['directory'] ?? false) && ! ($entry['symlink'] ?? false), 404, 'Archivo no encontrado.');

            $key = $this->metaKey($server, $folder, $entry);
            if (! Cache::has($key)) {
                $meta = ['name' => null];
                if ((int) ($entry['size'] ?? 0) <= self::META_MAX_BYTES) {
                    $tmp = tempnam(sys_get_temp_dir(), 'cinjar');
                    try {
                        $client->withOptions(['sink' => $tmp])
                            ->get('/servers/'.$server->uuid.'/files/contents', ['file' => '/'.$folder.'/'.$file])->throw();
                        $meta = $this->readJar($tmp);
                    } finally {
                        @unlink($tmp);
                    }
                }
                Cache::put($key, array_filter($meta, fn ($v) => $v !== null && $v !== []), now()->addDays(30));
            }

            return response()->json($this->present($server, $folder, $entry));
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo leer el archivo en el nodo.'], 502);
        }
    }

    public function toggle(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $data = $request->validate(['folder' => 'required|string', 'file' => 'required|string|max:255']);
        $folder = $this->folder($server, $data['folder']);
        $file = $this->jarName($data['file']);
        $target = preg_match('/\.disabled$/i', $file) ? preg_replace('/\.disabled$/i', '', $file) : $file.'.disabled';

        try {
            $client = $wings->forServer($server);
            $entries = collect($this->folderEntries($client, $server, $folder) ?? []);
            $entry = $entries->firstWhere('name', $file);
            abort_unless($entry && ! ($entry['symlink'] ?? false), 404, 'Archivo no encontrado.');
            abort_if($entries->contains('name', $target), 409, 'Ya existe un archivo llamado '.$target.'.');

            $client->put('/servers/'.$server->uuid.'/files/rename', ['root' => '/'.$folder, 'files' => [['from' => $file, 'to' => $target]]])->throw();
            $enabled = ! preg_match('/\.disabled$/i', $target);
            $this->logActivity($server, $request, $enabled ? 'addon:enable' : 'addon:disable', ($enabled ? 'Activó ' : 'Desactivó ').$folder.'/'.$target);

            return response()->json(['file' => $target, 'enabled' => $enabled]);
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'Wings no pudo renombrar el archivo.'], 502);
        }
    }

    public function destroy(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $data = $request->validate(['folder' => 'required|string', 'file' => 'required|string|max:255']);
        $folder = $this->folder($server, $data['folder']);
        $file = $this->jarName($data['file']);

        try {
            $client = $wings->forServer($server);
            $entry = collect($this->folderEntries($client, $server, $folder) ?? [])->firstWhere('name', $file);
            abort_unless($entry && ! ($entry['directory'] ?? false) && ! ($entry['symlink'] ?? false), 404, 'Archivo no encontrado.');

            $client->post('/servers/'.$server->uuid.'/files/delete', ['root' => '/'.$folder, 'files' => [$file]])->throw();
            $this->logActivity($server, $request, 'addon:delete', 'Eliminó '.$folder.'/'.$file);

            return response()->noContent();
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'Wings no pudo borrar el archivo.'], 502);
        }
    }

    public function upload(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $request->validate(['folder' => 'required|string', 'upload' => 'required|file|max:102400']);
        $folder = $this->folder($server, (string) $request->input('folder'));
        $upload = $request->file('upload');
        $name = $this->jarName((string) $upload->getClientOriginalName());
        abort_unless(preg_match('/\.jar$/i', $name), 422, 'Solo se pueden subir archivos .jar.');

        $zip = new ZipArchive();
        abort_unless($zip->open($upload->getRealPath()) === true, 422, 'El archivo no es un .jar válido.');
        $zip->close();

        try {
            $client = $wings->forServer($server)->timeout(120);
            $entries = $this->folderEntries($client, $server, $folder);
            if ($entries === null) {
                $client->post('/servers/'.$server->uuid.'/files/create-directory', ['path' => '/', 'name' => $folder])->throw();
                $entries = [];
            }
            $taken = collect($entries)->pluck('name');
            abort_if($taken->contains($name) || $taken->contains($name.'.disabled'), 409, 'Ya existe '.$name.' en '.$folder.'.');

            $stream = fopen($upload->getRealPath(), 'rb');
            try {
                $client->withBody($stream, 'application/java-archive')->withHeaders(['Content-Length' => (string) $upload->getSize()])
                    ->post('/servers/'.$server->uuid.'/files/write?'.http_build_query(['file' => '/'.$folder.'/'.$name]))->throw();
            } finally {
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }
            $this->logActivity($server, $request, 'addon:upload', 'Subió '.$folder.'/'.$name);

            return response()->noContent();
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'Wings no pudo recibir el archivo.'], 502);
        }
    }

    // ------------------------------------------------------------------
    // Catálogo de Modrinth: explorar e instalar
    // ------------------------------------------------------------------

    private const MODRINTH = 'https://api.modrinth.com/v2';

    private const MODRINTH_UA = 'cinammon-net/panel (https://panel.cinammon.net)';

    /** Loaders de Modrinth compatibles con el servidor (vacío = no se puede explorar). */
    private function modrinthLoaders(Server $server): array
    {
        $name = strtolower((string) $server->egg?->name);

        return match (true) {
            str_contains($name, 'velocity') => ['velocity'],
            str_contains($name, 'bungee') || str_contains($name, 'waterfall') || str_contains($name, 'travertine') => ['bungeecord', 'waterfall'],
            str_contains($name, 'folia') => ['folia'],
            str_contains($name, 'paper') || str_contains($name, 'purpur') || str_contains($name, 'spigot') || str_contains($name, 'bukkit') || str_contains($name, 'pufferfish') => ['paper', 'purpur', 'spigot', 'bukkit'],
            str_contains($name, 'neoforge') => ['neoforge'],
            str_contains($name, 'quilt') => ['quilt', 'fabric'],
            str_contains($name, 'fabric') => ['fabric'],
            str_contains($name, 'sponge') => ['sponge'],
            str_contains($name, 'forge') => ['forge'],
            default => [],
        };
    }

    /** Versión de Minecraft del servidor: variable del huevo, carpeta versions/ (Paper) o version_history.json. */
    private function minecraftVersion($client, Server $server): ?string
    {
        $isVersion = fn ($v) => is_string($v) && preg_match('/^\d+\.\d+(\.\d+)?$/', trim($v));

        $variables = $server->egg->variables()->whereIn('env_variable', ['MINECRAFT_VERSION', 'MC_VERSION', 'VERSION', 'MINECRAFT_VER'])->get();
        $values = \Illuminate\Support\Facades\DB::table('server_variables')->where('server_id', $server->id)->pluck('variable_value', 'variable_id');
        foreach ($variables as $variable) {
            $value = trim((string) ($values[$variable->id] ?? $variable->default_value ?? ''));
            if ($isVersion($value)) {
                return $value;
            }
        }

        return Cache::remember('addons_mcver:'.$server->uuid, now()->addMinutes(10), function () use ($client, $server, $isVersion) {
            try {
                $root = collect($client->get('/servers/'.$server->uuid.'/files/list-directory', ['directory' => '/'])->throw()->json() ?? []);
                $versions = $root->firstWhere('name', 'versions');
                if ($versions && ($versions['directory'] ?? false) && ! ($versions['symlink'] ?? false)) {
                    $dirs = collect($client->get('/servers/'.$server->uuid.'/files/list-directory', ['directory' => '/versions'])->throw()->json() ?? [])
                        ->filter(fn ($e) => ($e['directory'] ?? false) && $isVersion($e['name'] ?? null))->pluck('name')
                        ->sort(fn ($a, $b) => version_compare($b, $a))->values();
                    if ($dirs->isNotEmpty()) {
                        return $dirs->first();
                    }
                }
                if ($root->contains('name', 'version_history.json')) {
                    $history = $client->get('/servers/'.$server->uuid.'/files/contents', ['file' => '/version_history.json'])->body();
                    if (preg_match('/MC:\s*(\d+\.\d+(?:\.\d+)?)/', $history, $m)) {
                        return $m[1];
                    }
                }
            } catch (ConnectionException|RequestException $exception) {
            }

            return null;
        });
    }

    private function modrinth(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withHeaders(['User-Agent' => self::MODRINTH_UA])->acceptJson()->timeout(15);
    }

    public function browse(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $data = $request->validate(['q' => 'nullable|string|max:100', 'offset' => 'nullable|integer|min:0|max:1000', 'folder' => 'required|string']);
        $folder = $this->folder($server, $data['folder']);
        $loaders = $this->modrinthLoaders($server);
        if ($loaders === []) {
            return response()->json(['supported' => false, 'hits' => [], 'total' => 0]);
        }
        $version = $this->minecraftVersion($wings->forServer($server)->timeout(10), $server);
        $isPlugin = $folder === 'plugins';

        $facets = [array_map(fn ($l) => 'categories:'.$l, $loaders), ['project_type:'.($isPlugin ? 'plugin' : 'mod')], ['server_side:required', 'server_side:optional']];
        if ($version) {
            $facets[] = ['versions:'.$version];
        }
        $query = trim((string) ($data['q'] ?? ''));
        $params = [
            'query' => $query,
            'facets' => json_encode($facets),
            'index' => $query === '' ? 'downloads' : 'relevance',
            'limit' => 20,
            'offset' => (int) ($data['offset'] ?? 0),
        ];

        try {
            $result = Cache::remember('modrinth_search:'.md5(json_encode($params)), now()->addMinutes(10), function () use ($params) {
                return $this->modrinth()->get(self::MODRINTH.'/search', $params)->throw()->json();
            });
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo consultar Modrinth. Prueba de nuevo en un momento.'], 502);
        }

        return response()->json([
            'supported' => true,
            'loaders' => $loaders,
            'version' => $version,
            'total' => (int) ($result['total_hits'] ?? 0),
            'hits' => collect($result['hits'] ?? [])->map(fn ($h) => [
                'id' => $h['project_id'] ?? null,
                'slug' => $h['slug'] ?? null,
                'title' => Str::limit((string) ($h['title'] ?? ''), 80, '…'),
                'description' => Str::limit((string) ($h['description'] ?? ''), 200, '…'),
                'author' => $h['author'] ?? null,
                'downloads' => (int) ($h['downloads'] ?? 0),
                'icon' => isset($h['icon_url']) && preg_match('#^https://cdn\.modrinth\.com/#', (string) $h['icon_url']) ? $h['icon_url'] : null,
                'categories' => array_values(array_diff($h['categories'] ?? [], ['paper', 'purpur', 'spigot', 'bukkit', 'folia', 'velocity', 'bungeecord', 'waterfall', 'fabric', 'forge', 'neoforge', 'quilt', 'sponge'])),
            ])->filter(fn ($h) => $h['id'])->values(),
        ]);
    }

    public function install(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $data = $request->validate(['project' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9_-]+$/'], 'folder' => 'required|string']);
        $folder = $this->folder($server, $data['folder']);
        $loaders = $this->modrinthLoaders($server);
        abort_if($loaders === [], 422, 'Este tipo de servidor no es compatible con Modrinth.');

        $client = $wings->forServer($server)->timeout(120);
        $version = $this->minecraftVersion($client, $server);
        $params = ['loaders' => json_encode($loaders)];
        if ($version) {
            $params['game_versions'] = json_encode([$version]);
        }

        try {
            $versions = $this->modrinth()->get(self::MODRINTH.'/project/'.$data['project'].'/version', $params)->throw()->json() ?? [];
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo consultar Modrinth.'], 502);
        }
        $release = collect($versions)->firstWhere('version_type', 'release') ?? ($versions[0] ?? null);
        abort_unless($release, 404, 'No hay ninguna versión compatible'.($version ? ' con Minecraft '.$version : '').'.');
        $file = collect($release['files'] ?? [])->firstWhere('primary', true) ?? ($release['files'][0] ?? null);
        abort_unless($file && preg_match('#^https://cdn\.modrinth\.com/#', (string) ($file['url'] ?? '')), 422, 'Archivo de descarga no válido.');
        $name = $this->jarName(basename(rawurldecode(parse_url($file['url'], PHP_URL_PATH))));
        abort_unless(preg_match('/\.jar$/i', $name), 422, 'El archivo no es un .jar.');
        abort_if((int) ($file['size'] ?? 0) > 100 * 1024 * 1024, 413, 'El archivo es demasiado grande.');

        try {
            $entries = $this->folderEntries($client, $server, $folder);
            if ($entries === null) {
                $client->post('/servers/'.$server->uuid.'/files/create-directory', ['path' => '/', 'name' => $folder])->throw();
                $entries = [];
            }
            $taken = collect($entries)->pluck('name');
            abort_if($taken->contains($name) || $taken->contains($name.'.disabled'), 409, 'Ya está instalado ('.$name.').');

            $tmp = tempnam(sys_get_temp_dir(), 'cinmr');
            try {
                Http::withHeaders(['User-Agent' => self::MODRINTH_UA])->timeout(120)->withOptions(['sink' => $tmp])->get($file['url'])->throw();
                $sha512 = $file['hashes']['sha512'] ?? null;
                abort_unless($sha512 && hash_equals($sha512, hash_file('sha512', $tmp)), 422, 'La descarga no coincide con la firma de Modrinth.');
                $stream = fopen($tmp, 'rb');
                try {
                    $client->withBody($stream, 'application/java-archive')->withHeaders(['Content-Length' => (string) filesize($tmp)])
                        ->post('/servers/'.$server->uuid.'/files/write?'.http_build_query(['file' => '/'.$folder.'/'.$name]))->throw();
                } finally {
                    if (is_resource($stream)) {
                        fclose($stream);
                    }
                }
            } finally {
                @unlink($tmp);
            }
            $this->logActivity($server, $request, 'addon:install', 'Instaló '.$folder.'/'.$name.' desde Modrinth');

            $required = collect($release['dependencies'] ?? [])->where('dependency_type', 'required')->pluck('project_id')->filter()->values();

            return response()->json(['file' => $name, 'version' => $release['version_number'] ?? null, 'requires' => $required]);
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo descargar o guardar el archivo.'], 502);
        }
    }

    // ------------------------------------------------------------------
    // Lectura de descriptores dentro del .jar
    // ------------------------------------------------------------------

    private function readJar(string $path): array
    {
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            return ['name' => null];
        }
        try {
            $get = function (string $entry) use ($zip): ?string {
                $stat = $zip->statName($entry);
                if (! $stat || $stat['size'] > 512 * 1024) {
                    return null;
                }
                $content = $zip->getFromName($entry);

                return $content === false ? null : $content;
            };

            foreach (['paper-plugin.yml' => 'Paper', 'plugin.yml' => 'Bukkit', 'bungee.yml' => 'BungeeCord'] as $file => $loader) {
                if (($yml = $get($file)) !== null) {
                    return $this->fromYaml($yml, $loader);
                }
            }
            if (($json = $get('velocity-plugin.json')) !== null) {
                $d = json_decode($json, true) ?: [];

                return $this->clean(['name' => $d['name'] ?? $d['id'] ?? null, 'version' => $d['version'] ?? null, 'description' => $d['description'] ?? null,
                    'authors' => $d['authors'] ?? [], 'website' => $d['url'] ?? null, 'loader' => 'Velocity']);
            }
            foreach (['fabric.mod.json' => 'Fabric', 'quilt.mod.json' => 'Quilt'] as $file => $loader) {
                if (($json = $get($file)) !== null) {
                    $d = json_decode($json, true) ?: [];
                    $q = $d['quilt_loader']['metadata'] ?? null;
                    $authors = collect($q['contributors'] ?? $d['authors'] ?? [])
                        ->map(fn ($a, $k) => is_array($a) ? ($a['name'] ?? null) : (is_string($k) ? $k : $a))->filter()->values()->all();

                    return $this->clean([
                        'name' => $q['name'] ?? $d['name'] ?? $d['id'] ?? null,
                        'version' => $d['quilt_loader']['version'] ?? $d['version'] ?? null,
                        'description' => $q['description'] ?? $d['description'] ?? null,
                        'authors' => $authors,
                        'website' => $q['contact']['homepage'] ?? $d['contact']['homepage'] ?? null,
                        'loader' => $loader,
                    ]);
                }
            }
            foreach (['META-INF/neoforge.mods.toml' => 'NeoForge', 'META-INF/mods.toml' => 'Forge'] as $file => $loader) {
                if (($toml = $get($file)) !== null) {
                    $field = function (string $key) use ($toml): ?string {
                        if (preg_match('/^\s*'.$key.'\s*=\s*\'\'\'(.*?)\'\'\'/ms', $toml, $m) || preg_match('/^\s*'.$key.'\s*=\s*"((?:[^"\\\\]|\\\\.)*)"/m', $toml, $m)) {
                            return trim(stripcslashes($m[1]));
                        }

                        return null;
                    };
                    $version = $field('version');
                    if ($version === null || str_contains($version, '${')) {
                        $manifest = $get('META-INF/MANIFEST.MF') ?? '';
                        $version = preg_match('/^Implementation-Version:\s*(.+)$/mi', $manifest, $m) ? trim($m[1]) : null;
                    }
                    $authors = $field('authors');

                    return $this->clean([
                        'name' => $field('displayName') ?? $field('modId'),
                        'version' => $version,
                        'description' => $field('description'),
                        'authors' => $authors ? preg_split('/\s*,\s*/', $authors) : [],
                        'website' => $field('displayURL'),
                        'loader' => $loader,
                    ]);
                }
            }
            if (($json = $get('mcmod.info')) !== null) {
                $d = json_decode($json, true) ?: [];
                $d = $d['modList'][0] ?? $d[0] ?? [];

                return $this->clean(['name' => $d['name'] ?? $d['modid'] ?? null, 'version' => $d['version'] ?? null, 'description' => $d['description'] ?? null,
                    'authors' => $d['authorList'] ?? $d['authors'] ?? [], 'website' => $d['url'] ?? null, 'loader' => 'Forge']);
            }

            return ['name' => null];
        } finally {
            $zip->close();
        }
    }

    /** plugin.yml: solo se leen claves de primer nivel sencillas (no hace falta un parser YAML completo). */
    private function fromYaml(string $yml, string $loader): array
    {
        $value = function (string $key) use ($yml): ?string {
            if (! preg_match('/^'.$key.':[ \t]*(.*)$/m', $yml, $m)) {
                return null;
            }
            $v = trim($m[1]);
            if ($v === '' || $v === '|' || $v === '>') {
                return null;
            }

            return trim($v, "\"' ");
        };
        $authors = [];
        if ($a = $value('author')) {
            $authors[] = $a;
        }
        if (($list = $value('authors')) && str_starts_with($list, '[')) {
            $authors = array_merge($authors, array_map(fn ($s) => trim($s, "\"' "), explode(',', trim($list, '[]'))));
        } elseif (preg_match('/^authors:\s*\n((?:\s*-\s*.+\n?)+)/m', $yml, $m)) {
            preg_match_all('/-\s*(.+)/', $m[1], $mm);
            $authors = array_merge($authors, array_map(fn ($s) => trim($s, "\"' "), $mm[1]));
        }

        return $this->clean([
            'name' => $value('name'),
            'version' => $value('version'),
            'description' => $value('description'),
            'authors' => $authors,
            'website' => $value('website'),
            'loader' => $loader,
        ]);
    }

    private function clean(array $meta): array
    {
        $str = fn ($v, $max) => is_string($v) && trim($v) !== '' ? Str::limit(trim(preg_replace('/\s+/', ' ', $v)), $max, '…') : null;
        $website = $str($meta['website'] ?? null, 200);

        return [
            'name' => $str($meta['name'] ?? null, 80),
            'version' => $str($meta['version'] ?? null, 40),
            'description' => $str($meta['description'] ?? null, 300),
            'authors' => collect((array) ($meta['authors'] ?? []))->filter(fn ($a) => is_string($a) && trim($a) !== '')
                ->map(fn ($a) => Str::limit(trim($a), 40, '…'))->unique()->take(5)->values()->all(),
            'website' => $website && preg_match('#^https?://#i', $website) ? $website : null,
            'loader' => $meta['loader'] ?? null,
        ];
    }
}
