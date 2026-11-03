<?php

namespace App\Support;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use ZipArchive;

/**
 * Wings simulado para el nodo de la demo. Atiende la misma API que el daemon real
 * (archivos, consola, energía, instalación) sobre carpetas locales de ejemplo, de modo
 * que las páginas del panel funcionan sin ningún servidor real detrás.
 */
class DemoWings
{
    public const HOST = 'nodo-demo.invalid';

    private const MAX_FILE_BYTES = 1048576;
    private const MAX_TOTAL_BYTES = 10485760;
    private const MAX_LOG_LINES = 300;

    public static function register(): void
    {
        Http::fake(function (Request $request) {
            $host = (string) parse_url($request->url(), PHP_URL_HOST);

            return $host === self::HOST ? self::handle($request) : null;
        });
    }

    public static function base(): string
    {
        return storage_path('app/demo-servers');
    }

    public static function wipe(): void
    {
        File::deleteDirectory(self::base());
        Cache::forget('demo_wings.events');
        self::event(null, 'system', null, 'INFO', 'Wings simulado iniciado (nodo de demostración)');
        // Intentos de SFTP simulados (rango de documentación 203.0.113.0/24): el propietario ve la IP y el resto no.
        foreach ([['203.0.113.45', 'root'], ['203.0.113.45', 'admin']] as [$ip, $user]) {
            self::event(null, 'sftp_failed', null, 'WARN', 'failed to validate user credentials (invalid username or password)',
                "failed to validate user credentials (invalid username or password) ip={$ip}:51022 method=password subsystem=sftp username={$user}", $ip);
        }
    }

    /** Crea las carpetas y el registro de consola de ejemplo de un servidor. */
    public static function seed(string $uuid, string $kind, bool $running = true): void
    {
        $root = self::root($uuid);
        File::deleteDirectory(dirname($root));
        File::ensureDirectoryExists($root);

        foreach (self::sampleFiles($kind) as $path => $content) {
            File::ensureDirectoryExists(dirname($root.'/'.$path));
            File::put($root.'/'.$path, $content);
        }

        $first = $kind === 'minecraft'
            ? ['Starting minecraft server version 1.21', 'Loading properties', 'Done (6.214s)! For help, type "help"']
            : ['Instalando dependencias...', 'Iniciando Cinammon Bot en Node.js v22...', 'Bot listo.'];
        foreach ($first as $line) {
            self::log($uuid, $kind, $line);
        }

        self::setState($uuid, $running ? 'running' : 'offline');
        self::event($uuid, 'install_start');
        self::event($uuid, 'install_done');
        self::event($uuid, 'boot_ready');
    }

    public static function kindFor(?string $category, ?string $name): string
    {
        $name = strtolower((string) $name);

        if ($category === 'minecraft' || str_contains($name, 'paper') || str_contains($name, 'minecraft')) {
            return 'minecraft';
        }

        return in_array($category, ['generic', 'bots'], true) || str_contains($name, 'node') ? 'bot' : 'generic';
    }

    /** Eventos de Wings simulados, en el mismo formato depurado que genera el recolector del panel real. */
    public static function events(bool $raw = false): array
    {
        $events = Cache::get('demo_wings.events', []);

        if ($raw) {
            // El propietario ve el texto original (con las IPs de ejemplo); el resto, la versión depurada.
            $events = array_map(fn ($e) => isset($e['raw']) ? [...$e, 'detail' => $e['raw']] : $e, $events);
        }

        return ['generated_at' => time(), 'events' => $events];
    }

    private static function event(?string $uuid, string $kind, ?string $action = null, string $level = 'INFO', string $detail = '', ?string $raw = null, ?string $ip = null): void
    {
        $events = Cache::get('demo_wings.events', []);
        $events[] = [
            'id' => substr(md5(uniqid('', true)), 0, 12), 'ts' => gmdate('Y-m-d\TH:i:s\Z'), 'level' => $level, 'kind' => $kind,
            'action' => $action, 'server' => $uuid, 'server_short' => null, 'user' => null, 'count' => 1, 'detail' => $detail !== '' ? $detail : null, 'raw' => $raw, 'ip' => $ip,
        ];
        Cache::forever('demo_wings.events', array_slice($events, -300));
    }

    /** Datos para la página «Wings» de la demo: mismo formato que la instantánea real, todo simulado. */
    public static function telemetry(): array
    {
        $now = time();
        $started = Cache::rememberForever('demo_wings.started_at', fn () => $now);

        $containers = DB::table('servers')->get(['uuid', 'image', 'memory'])->map(function ($server) use ($now) {
            $state = self::state($server->uuid);
            $running = $state['state'] === 'running';
            $age = max(1, $now - $state['since']);

            return [
                'name' => $server->uuid,
                'image' => $server->image,
                'status' => $running ? 'En marcha desde hace '.(int) ceil($age / 60).' min (simulado)' : 'Detenido (simulado)',
                'cpu_percent' => $running ? round(4 + 3 * sin($now / 6) ** 2, 2) : 0.0,
                'memory_mb' => $running ? round($server->memory * (0.34 + 0.04 * sin($now / 9)), 1) : 0.0,
                'isolation' => null,
            ];
        })->all();

        return [
            'generated_at' => $now,
            'wings' => ['service' => 'active', 'started_at' => $started, 'memory_mb' => round(memory_get_usage() / 1048576, 1), 'cpu_seconds' => 0.0, 'restarts' => 0],
            'ports' => ['wings_api' => 'local', 'sftp' => 'closed'],
            'containers' => $containers,
            'host' => ['load' => [0.12, 0.09, 0.07], 'cpus' => 4, 'memory_used_mb' => 2048, 'memory_total_mb' => 8192, 'disk_used_gb' => round(self::size(self::base()) / 1e9, 3), 'disk_total_gb' => 50.0, 'uptime_hours' => round(($now - $started) / 3600, 1)],
            'security' => null,
        ];
    }

    public static function limits(): array
    {
        return ['file_bytes' => self::MAX_FILE_BYTES, 'server_bytes' => self::MAX_TOTAL_BYTES];
    }

    // ───────────────────────── enrutado ─────────────────────────

    private static function handle(Request $request)
    {
        $url = parse_url($request->url());
        $path = preg_replace('#^/api#', '', $url['path'] ?? '/');
        parse_str($url['query'] ?? '', $query);
        $method = strtoupper($request->method());

        if ($path === '/system') {
            return self::json(['version' => '1.0.0-demo', 'architecture' => 'amd64', 'os' => 'linux', 'cpu_count' => 4, 'kernel_version' => 'demo', 'docker_version' => 'demo']);
        }

        if ($path === '/servers' && $method === 'POST') {
            return self::provision((string) ($request->data()['uuid'] ?? ''));
        }

        if (! preg_match('#^/servers/([0-9a-f-]{36})(/.*)?$#', $path, $m)) {
            return self::json(['error' => 'No encontrado'], 404);
        }

        [$uuid, $sub] = [$m[1], $m[2] ?? ''];

        if ($sub === '' && $method === 'GET') {
            return self::status($uuid);
        }
        if ($sub === '' && $method === 'DELETE') {
            File::deleteDirectory(dirname(self::root($uuid)));
            Cache::forget(self::stateKey($uuid));

            return self::json([], 204);
        }

        return match (true) {
            $sub === '/logs' => self::json(['data' => self::tail($uuid, (int) ($query['size'] ?? 100))]),
            $sub === '/power' && $method === 'POST' => self::power($uuid, (string) ($request->data()['action'] ?? '')),
            $sub === '/commands' && $method === 'POST' => self::commands($uuid, (array) ($request->data()['commands'] ?? [])),
            $sub === '/reinstall' && $method === 'POST' => self::reinstall($uuid),
            str_starts_with($sub, '/files/') => self::files($request, $uuid, substr($sub, 7), $method, $query),
            default => self::json(['error' => 'No encontrado'], 404),
        };
    }

    private static function json($data, int $status = 200)
    {
        return Http::response($data, $status);
    }

    // ───────────────────── estado, energía y consola ─────────────────────

    private static function stateKey(string $uuid): string
    {
        return "demo_wings.state.{$uuid}";
    }

    private static function setState(string $uuid, string $state): void
    {
        Cache::forever(self::stateKey($uuid), ['state' => $state, 'since' => time()]);
    }

    private static function state(string $uuid): array
    {
        return Cache::get(self::stateKey($uuid)) ?? ['state' => 'running', 'since' => time()];
    }

    private static function kind(string $uuid): string
    {
        return File::exists(self::root($uuid).'/server.properties') ? 'minecraft' : 'bot';
    }

    private static function status(string $uuid)
    {
        $state = self::state($uuid);
        $memoryMb = (int) (DB::table('servers')->where('uuid', $uuid)->value('memory') ?: 512);
        $running = $state['state'] === 'running';
        $age = max(1, time() - $state['since']);

        return self::json([
            'state' => $state['state'],
            'is_suspended' => false,
            'utilization' => [
                'memory_bytes' => $running ? (int) ($memoryMb * 1048576 * (0.34 + 0.04 * sin(time() / 9))) : 0,
                'memory_limit_bytes' => $memoryMb * 1048576,
                'cpu_absolute' => $running ? round(4 + 3 * sin(time() / 6) ** 2, 2) : 0,
                'network' => ['rx_bytes' => $running ? $age * 1800 : 0, 'tx_bytes' => $running ? $age * 1200 : 0],
                'uptime' => $running ? $age * 1000 : 0,
                'state' => $state['state'],
                'disk_bytes' => self::size(self::root($uuid)),
            ],
        ]);
    }

    private static function log(string $uuid, string $kind, string $line): void
    {
        $stamp = now()->format('H:i:s');
        $text = $kind === 'minecraft' ? "[{$stamp} INFO]: {$line}" : "[{$stamp}] [CinammonBot] {$line}";
        $file = dirname(self::root($uuid)).'/console.log';
        File::ensureDirectoryExists(dirname($file));
        $lines = File::exists($file) ? array_slice(explode("\n", trim(File::get($file))), -(self::MAX_LOG_LINES - 1)) : [];
        $lines[] = $text;
        File::put($file, implode("\n", $lines)."\n");
    }

    private static function tail(string $uuid, int $size): array
    {
        $file = dirname(self::root($uuid)).'/console.log';

        return File::exists($file) ? array_slice(explode("\n", trim(File::get($file))), -max(1, min($size, 300))) : [];
    }

    private static function power(string $uuid, string $action)
    {
        $kind = self::kind($uuid);

        if (! in_array($action, ['start', 'stop', 'restart', 'kill'], true)) {
            return self::json(['error' => 'Acción no válida'], 422);
        }

        self::event($uuid, 'power', $action);
        if (in_array($action, ['stop', 'restart', 'kill'], true)) {
            self::log($uuid, $kind, $kind === 'minecraft' ? 'Stopping the server' : 'Deteniendo bot...');
        }
        if ($action === 'stop' || $action === 'kill') {
            self::setState($uuid, 'offline');
        } else {
            self::log($uuid, $kind, $kind === 'minecraft' ? 'Done (4.870s)! For help, type "help"' : 'Bot listo.');
            self::setState($uuid, 'running');
        }
        self::event($uuid, 'power_done', $action);

        return self::json([], 202);
    }

    private static function commands(string $uuid, array $commands)
    {
        $kind = self::kind($uuid);
        if (self::state($uuid)['state'] !== 'running') {
            return self::json(['error' => 'El servidor está apagado'], 502);
        }

        foreach ($commands as $command) {
            $command = trim((string) $command);
            self::log($uuid, $kind, '> '.Str::limit($command, 200, ''));
            $reply = match (true) {
                str_starts_with($command, 'say ') => '[Server] '.Str::limit(substr($command, 4), 200, ''),
                $command === 'list' => 'There are 1 of a max of 20 players online: Steve',
                $command === 'help' => 'Comandos de la demo: say <mensaje>, list, help, stop',
                $command === 'stop' => 'Stopping the server',
                default => 'Comando simulado: '.Str::limit($command, 100, ''),
            };
            self::log($uuid, $kind, $reply);
            if ($command === 'stop') {
                self::setState($uuid, 'offline');
                self::event($uuid, 'power', 'stop');
                self::event($uuid, 'power_done', 'stop');
            }
        }

        return self::json([], 204);
    }

    private static function provision(string $uuid)
    {
        if (! preg_match('/^[0-9a-f-]{36}$/', $uuid)) {
            return self::json(['error' => 'uuid no válido'], 422);
        }

        $server = DB::table('servers')->join('eggs', 'eggs.id', '=', 'servers.egg_id')
            ->where('servers.uuid', $uuid)->first(['eggs.category', 'eggs.name']);
        self::seed($uuid, self::kindFor($server->category ?? null, $server->name ?? null));
        DB::table('servers')->where('uuid', $uuid)->update(['installed_at' => now()]);

        return self::json([], 202);
    }

    private static function reinstall(string $uuid)
    {
        $kind = self::kind($uuid);
        self::log($uuid, $kind, $kind === 'minecraft' ? 'Reinstalando el servidor...' : 'Reinstalando dependencias...');
        self::event($uuid, 'reinstall');
        self::event($uuid, 'install_done');
        DB::table('servers')->where('uuid', $uuid)->update(['installed_at' => now()]);

        return self::json([], 202);
    }

    // ───────────────────────── archivos ─────────────────────────

    private static function root(string $uuid): string
    {
        return self::base().'/'.$uuid.'/files';
    }

    private static function size(string $dir): int
    {
        if (! is_dir($dir)) {
            return 0;
        }
        $total = 0;
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS)) as $file) {
            $total += $file->getSize();
        }

        return $total;
    }

    /** Ruta absoluta dentro de la carpeta del servidor; null si intenta salirse de ella. */
    private static function resolve(string $uuid, string $relative): ?string
    {
        $parts = array_values(array_filter(explode('/', str_replace('\\', '/', $relative)), fn ($p) => $p !== ''));
        foreach ($parts as $part) {
            if ($part === '.' || $part === '..' || preg_match('/[\x00-\x1f]/', $part)) {
                return null;
            }
        }

        return rtrim(self::root($uuid).'/'.implode('/', $parts), '/');
    }

    private static function entry(string $full): array
    {
        $dir = is_dir($full);
        $mode = fileperms($full) & 0777;
        $mimes = ['json' => 'application/json', 'yml' => 'text/plain', 'yaml' => 'text/plain', 'js' => 'text/javascript', 'zip' => 'application/zip', 'md' => 'text/plain'];

        return [
            'name' => basename($full),
            'created' => date('c', filectime($full)),
            'modified' => date('c', filemtime($full)),
            'mode' => self::modeString($mode, $dir),
            'mode_bits' => decoct($mode),
            'size' => $dir ? 0 : filesize($full),
            'directory' => $dir,
            'file' => ! $dir,
            'symlink' => is_link($full),
            'mime' => $dir ? 'inode/directory' : ($mimes[pathinfo($full, PATHINFO_EXTENSION)] ?? 'text/plain'),
        ];
    }

    private static function modeString(int $mode, bool $directory): string
    {
        $text = $directory ? 'd' : '-';
        foreach ([[0400, 0200, 0100], [040, 020, 010], [04, 02, 01]] as [$read, $write, $execute]) {
            $text .= ($mode & $read ? 'r' : '-').($mode & $write ? 'w' : '-').($mode & $execute ? 'x' : '-');
        }

        return $text;
    }

    private static function noSpace()
    {
        return self::json(['error' => 'Sin espacio: la demo limita cada servidor a 10 MB y cada archivo a 1 MB.'], 507);
    }

    private static function files(Request $request, string $uuid, string $action, string $method, array $query)
    {
        File::ensureDirectoryExists(self::root($uuid));
        $data = $action === 'write' ? [] : $request->data();
        $notFound = self::json(['error' => 'No encontrado'], 404);

        switch ($action) {
            case 'list-directory':
                $dir = self::resolve($uuid, (string) ($query['directory'] ?? '/'));
                if (! $dir || ! is_dir($dir)) {
                    return $notFound;
                }

                return self::json(array_map(fn ($name) => self::entry($dir.'/'.$name), array_values(array_diff(scandir($dir), ['.', '..']))));

            case 'contents':
                $file = self::resolve($uuid, (string) ($query['file'] ?? ''));
                if (! $file || ! is_file($file)) {
                    return $notFound;
                }
                $body = File::get($file);
                if (basename($file) === 'bot-status.json' && is_array($status = json_decode($body, true))) {
                    $status['updated_at'] = now()->toIso8601String();
                    $status['connected'] = self::state($uuid)['state'] === 'running';
                    $body = json_encode($status, JSON_PRETTY_PRINT);
                }

                return Http::response($body, 200, ['Content-Type' => 'text/plain']);

            case 'write':
                $file = self::resolve($uuid, (string) ($query['file'] ?? ''));
                $body = $request->body();
                if (! $file || $file === self::root($uuid) || is_dir($file)) {
                    return self::json(['error' => 'Ruta no válida'], 422);
                }
                $existing = is_file($file) ? filesize($file) : 0;
                if (strlen($body) > self::MAX_FILE_BYTES || self::size(self::root($uuid)) - $existing + strlen($body) > self::MAX_TOTAL_BYTES) {
                    return self::noSpace();
                }
                File::ensureDirectoryExists(dirname($file));
                File::put($file, $body);

                return self::json([], 204);

            case 'create-directory':
                $dir = self::resolve($uuid, ($data['path'] ?? '/').'/'.($data['name'] ?? ''));
                if (! $dir || $dir === self::root($uuid)) {
                    return self::json(['error' => 'Ruta no válida'], 422);
                }
                File::ensureDirectoryExists($dir);

                return self::json([], 204);

            case 'rename':
                foreach ((array) ($data['files'] ?? []) as $pair) {
                    $from = self::resolve($uuid, ($data['root'] ?? '/').'/'.($pair['from'] ?? ''));
                    $to = self::resolve($uuid, ($data['root'] ?? '/').'/'.($pair['to'] ?? ''));
                    if (! $from || ! $to || ! file_exists($from) || file_exists($to) || $to === self::root($uuid)) {
                        return self::json(['error' => 'No se puede mover'], 422);
                    }
                    File::ensureDirectoryExists(dirname($to));
                    rename($from, $to);
                }

                return self::json([], 204);

            case 'copy':
                $from = self::resolve($uuid, (string) ($data['location'] ?? ''));
                if (! $from || ! is_file($from)) {
                    return $notFound;
                }
                if (self::size(self::root($uuid)) + filesize($from) > self::MAX_TOTAL_BYTES) {
                    return self::noSpace();
                }
                $name = pathinfo($from, PATHINFO_FILENAME);
                $ext = pathinfo($from, PATHINFO_EXTENSION) !== '' ? '.'.pathinfo($from, PATHINFO_EXTENSION) : '';
                for ($i = 1, $to = dirname($from)."/{$name} copy{$ext}"; file_exists($to); $i++) {
                    $to = dirname($from)."/{$name} copy {$i}{$ext}";
                }
                copy($from, $to);

                return self::json([], 204);

            case 'delete':
                foreach ((array) ($data['files'] ?? []) as $name) {
                    $target = self::resolve($uuid, ($data['root'] ?? '/').'/'.$name);
                    if ($target && $target !== self::root($uuid) && file_exists($target)) {
                        is_dir($target) ? File::deleteDirectory($target) : File::delete($target);
                    }
                }

                return self::json([], 204);

            case 'chmod':
                return self::json([], 204);

            case 'compress':
                $root = self::resolve($uuid, (string) ($data['root'] ?? '/'));
                $name = (string) ($data['name'] ?? '') ?: 'archivo-'.now()->format('Ymd-His').'.zip';
                $name = str_ends_with(strtolower($name), '.zip') ? $name : $name.'.zip';
                $archive = $root ? self::resolve($uuid, ($data['root'] ?? '/').'/'.$name) : null;
                if (! $root || ! $archive || file_exists($archive)) {
                    return self::json(['error' => 'No se puede comprimir'], 422);
                }
                $zip = new ZipArchive();
                $zip->open($archive, ZipArchive::CREATE);
                foreach ((array) ($data['files'] ?? []) as $item) {
                    $full = self::resolve($uuid, ($data['root'] ?? '/').'/'.$item);
                    if (! $full || ! file_exists($full)) {
                        continue;
                    }
                    if (is_file($full)) {
                        $zip->addFile($full, $item);
                    } else {
                        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($full, \FilesystemIterator::SKIP_DOTS)) as $f) {
                            $zip->addFile($f->getPathname(), $item.'/'.substr($f->getPathname(), strlen($full) + 1));
                        }
                    }
                }
                $zip->close();
                if (! is_file($archive) || self::size(self::root($uuid)) > self::MAX_TOTAL_BYTES) {
                    File::delete($archive);

                    return self::noSpace();
                }

                return self::json(self::entry($archive));

            case 'decompress':
                $root = self::resolve($uuid, (string) ($data['root'] ?? '/'));
                $archive = self::resolve($uuid, ($data['root'] ?? '/').'/'.($data['file'] ?? ''));
                $zip = new ZipArchive();
                if (! $root || ! $archive || ! is_file($archive) || $zip->open($archive) !== true) {
                    return self::json(['error' => 'Solo se pueden extraer archivos .zip en la demo'], 422);
                }
                $uncompressed = 0;
                for ($i = 0; $i < $zip->numFiles; $i++) {
                    $uncompressed += $zip->statIndex($i)['size'];
                    if (self::resolve($uuid, $zip->getNameIndex($i)) === null || str_starts_with($zip->getNameIndex($i), '/')) {
                        $zip->close();

                        return self::json(['error' => 'Archivo no válido'], 422);
                    }
                }
                if (self::size(self::root($uuid)) + $uncompressed > self::MAX_TOTAL_BYTES) {
                    $zip->close();

                    return self::noSpace();
                }
                $zip->extractTo($root);
                $zip->close();

                return self::json([], 204);
        }

        return $notFound;
    }

    // ───────────────────── contenido de ejemplo ─────────────────────

    private static function sampleFiles(string $kind): array
    {
        if ($kind === 'minecraft') {
            return [
                'server.properties' => "motd=Servidor de demostración · Cinammon.net\nserver-port=25565\nmax-players=20\ngamemode=survival\ndifficulty=normal\nonline-mode=true\nview-distance=10\nlevel-name=world\nwhite-list=false\n",
                'eula.txt' => "eula=true\n",
                'bukkit.yml' => "settings:\n  allow-end: true\n  connection-throttle: 4000\n  shutdown-message: Servidor reiniciando\n",
                'ops.json' => "[]\n",
                'whitelist.json' => "[]\n",
                'banned-players.json' => "[]\n",
                'banned-ips.json' => "[]\n",
                'logs/latest.log' => "[12:00:01 INFO]: Starting minecraft server version 1.21\n[12:00:07 INFO]: Done (6.214s)! For help, type \"help\"\n[12:03:20 INFO]: Steve joined the game\n",
                'plugins/README.txt' => "Sube aquí tus plugins (.jar). Este es un servidor de demostración.\n",
                'plugins/Essentials/config.yml' => "# Configuración de ejemplo\nnickname-prefix: '~'\nlocale: es\n",
                'world/README.txt' => "Mundo de demostración: aquí se guardaría tu mundo.\n",
            ];
        }

        if ($kind === 'bot') {
            return [
                'package.json' => "{\n  \"name\": \"cinammon-discord-bot\",\n  \"version\": \"2.0.0\",\n  \"main\": \"index.js\",\n  \"scripts\": { \"start\": \"node index.js\" },\n  \"dependencies\": { \"discord.js\": \"^14.25.1\" }\n}\n",
                'index.js' => "require('./src/index.js');\n",
                'src/index.js' => "// Bot de demostración\nconsole.log('Iniciando Cinammon Bot...');\n",
                'src/commands/ping.js' => "module.exports = {\n    name: 'ping',\n    execute: async () => 'Pong!',\n};\n",
                'bot-status.json' => "{\n  \"connected\": true,\n  \"configured\": true,\n  \"tag\": \"Demo Bot#0001\",\n  \"application_id\": \"000000000000000000\",\n  \"guilds\": 1,\n  \"message\": \"Conectado como Demo Bot#0001 · Comandos listos.\"\n}\n",
                'README.md' => "# Bot de demostración\n\nEdita los archivos y reinicia el servidor para ver los cambios.\n",
            ];
        }

        return ['README.txt' => "Servidor de demostración.\nPuedes crear, editar y borrar archivos libremente; la demo se restablece cada noche.\n"];
    }
}
