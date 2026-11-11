<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Models\ServerDatabase;
use App\Models\ServerSubdomain;
use App\Services\Daemon\WingsClient;
use App\Support\DatabaseProvisioner;
use App\Support\Panel;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Aplicaciones con un clic para el hosting web (webroot/ del WebHost o del egg WordPress).
 *
 * - WordPress queda totalmente instalado: base de datos, wp-config.php y usuario administrador.
 * - Joomla, Drupal, Matomo y Grav: se suben los archivos y se crea la base de datos; el cliente
 *   termina en el asistente de la propia app con los datos que le mostramos.
 *
 * Wings tiene las descargas remotas desactivadas, así que el panel descarga el paquete oficial
 * (caché de 24 h) y lo sube al servidor. Todo va por pasos cortos para mostrar el progreso.
 */
class ServerAppsController extends Controller
{
    private const ROOT = 'webroot';
    private const STAGING = 'cin-app-tmp';
    private const MARKER = '.cinammon-app';

    /** Catálogo. check = archivo/carpeta que prueba que el paquete es el correcto. */
    private const APPS = [
        'wordpress' => [
            'name' => 'WordPress',
            'url' => 'https://es.wordpress.org/latest-es_ES.tar.gz',
            'ext' => 'tar.gz', 'min' => 5_000_000, 'db' => true,
            'check' => 'wp-settings.php', 'configured' => 'wp-config.php',
            'admin' => '/wp-admin/', 'wizard' => null,
        ],
        'joomla' => [
            'name' => 'Joomla',
            'github' => ['joomla/joomla-cms', '/-Stable-Full_Package\.tar\.gz$/'],
            'ext' => 'tar.gz', 'min' => 10_000_000, 'db' => true,
            'check' => 'administrator', 'configured' => 'configuration.php',
            'admin' => '/administrator/', 'wizard' => '/installation/index.php',
        ],
        'drupal' => [
            'name' => 'Drupal',
            'url' => 'https://www.drupal.org/download-latest/tar.gz',
            'ext' => 'tar.gz', 'min' => 10_000_000, 'db' => true,
            'check' => 'core', 'configured' => 'sites/default/settings.php',
            'admin' => '/user/login', 'wizard' => '/core/install.php',
        ],
        'matomo' => [
            'name' => 'Matomo',
            'url' => 'https://builds.matomo.org/matomo.zip',
            'ext' => 'zip', 'min' => 10_000_000, 'db' => true,
            'check' => 'matomo.php', 'configured' => 'config/config.ini.php',
            'admin' => '/', 'wizard' => '/',
        ],
        'grav' => [
            'name' => 'Grav',
            'url' => 'https://getgrav.org/download/core/grav-admin/latest',
            'ext' => 'zip', 'min' => 5_000_000, 'db' => false,
            'check' => 'system', 'configured' => 'user/accounts/*',
            'admin' => '/admin', 'wizard' => '/admin',
        ],
    ];

    /**
     * Plantillas para el egg «Vite / Apps JavaScript»: el propio arranque del servidor crea el
     * proyecto (variable TEMPLATE), instala dependencias y compila. El panel solo lo orquesta.
     */
    private const JS_APPS = [
        'vitepress' => ['name' => 'VitePress'],
        'vite' => ['name' => 'Vite'],
    ];

    private const JS_ROOT = 'app';

    private function authorizeServer(Request $request, Server $server): void
    {
        $user = $request->user();
        abort_unless(
            $user->id === $server->owner_id ||
            $user->hasAnyRole(['Owner', 'Admin']) ||
            $server->subusers()->where('user_id', $user->id)->exists(),
            403,
            'No tienes permiso para gestionar este servidor.'
        );
        abort_unless($server->supportsWebApps() || $server->supportsJsApps(), 404, 'Las aplicaciones solo están disponibles en el hosting web.');
    }

    /** Dirección pública de la web: el dominio propio activo o, si no, el subdominio de Cinammon. */
    private function siteHost(Server $server): ?string
    {
        $custom = ServerSubdomain::where('server_id', $server->id)->where('kind', 'web')->where('status', 'active')->value('domain');

        return $custom ?: $server->siteHost();
    }

    private function client(WingsClient $wings, Server $server, int $timeout = 30): PendingRequest
    {
        return $wings->forServer($server)->timeout($timeout);
    }

    private function list(PendingRequest $client, Server $server, string $dir): ?array
    {
        $response = $client->get("/servers/{$server->uuid}/files/list-directory", ['directory' => '/'.$dir]);
        if ($response->status() === 404) {
            return null;
        }

        return $response->throw()->json() ?? [];
    }

    private function names(PendingRequest $client, Server $server, string $dir): \Illuminate\Support\Collection
    {
        return collect($this->list($client, $server, $dir) ?? [])->pluck('name');
    }

    private function exists(PendingRequest $client, Server $server, string $path): bool
    {
        $dir = trim(dirname($path), '.');
        $names = $this->names($client, $server, self::ROOT.($dir !== '' ? '/'.$dir : ''));

        return basename($path) === '*' ? $names->isNotEmpty() : $names->contains(basename($path));
    }

    private function contents(PendingRequest $client, Server $server, string $file): string
    {
        return (string) $client->get("/servers/{$server->uuid}/files/contents", ['file' => '/'.self::ROOT.'/'.$file])->body();
    }

    /**
     * Estado de webroot/:
     *  empty     vacío o solo con la bienvenida de Cinammon
     *  installed hay una app del catálogo (configured = ya se terminó su instalación)
     *  other     hay otra web: no se toca
     */
    private function state(PendingRequest $client, Server $server): array
    {
        $names = $this->names($client, $server, self::ROOT);
        $visible = $names->reject(fn ($n) => in_array($n, [self::STAGING, self::MARKER], true) || str_starts_with($n, 'cin-setup-'));

        $app = null;
        if ($names->contains(self::MARKER)) {
            $app = trim($this->contents($client, $server, self::MARKER));
        } elseif ($names->contains('wp-settings.php') && $names->contains('wp-includes')) {
            $app = 'wordpress'; // WordPress descargado por el egg (o por «Instalar WordPress» al reinstalar)
        }
        if ($app && isset(self::APPS[$app])) {
            return ['state' => 'installed', 'app' => $app, 'configured' => $this->exists($client, $server, self::APPS[$app]['configured'])];
        }
        if ($visible->isEmpty()) {
            return ['state' => 'empty'];
        }
        if ($visible->values()->all() === ['index.php'] && $this->isWelcome($this->contents($client, $server, 'index.php'))) {
            return ['state' => 'empty', 'welcome' => true];
        }

        return ['state' => 'other', 'files' => $visible->take(8)->values()->all()];
    }

    private function isWelcome(string $body): bool
    {
        return str_contains($body, 'Cinammon WebHost') || str_contains($body, 'Berny WebHost');
    }

    /** Lo que ve el cliente de una app instalada: enlaces y, si usa base de datos, sus datos. */
    private function details(Server $server, string $app, bool $configured, ?string $host): array
    {
        $def = self::APPS[$app];
        $site = $host ? "https://{$host}" : null;
        $db = $def['db'] ? $this->appDatabase($server, $app) : null;

        return [
            'state' => 'installed',
            'app' => $app,
            'configured' => $configured,
            'site' => $site,
            'admin' => $site ? $site.$def['admin'] : null,
            'wizard' => $site && $def['wizard'] ? $site.$def['wizard'] : null,
            'database' => $db ? DatabaseProvisioner::present($db) : null,
        ];
    }

    public function page(Request $request, Server $server): Response
    {
        $this->authorizeServer($request, $server);
        $host = $this->siteHost($server);

        $js = $server->supportsJsApps();

        return Inertia::render('Servers/Apps', [
            'server' => ['id' => $server->id, 'name' => $server->name, 'owner_id' => $server->owner_id],
            'site' => $host ? "https://{$host}" : null,
            'kind' => $js ? 'js' : 'php',
            'available' => ! Panel::demoMode() && $host !== null && ($js || DatabaseProvisioner::enabled()),
            'demo' => Panel::demoMode(),
            'ownerEmail' => $server->owner?->email,
            'apps' => $js
                ? collect(self::JS_APPS)->map(fn ($a, $k) => ['key' => $k, 'name' => $a['name'], 'db' => false, 'auto' => true])->values()
                : collect(self::APPS)->map(fn ($a, $k) => ['key' => $k, 'name' => $a['name'], 'db' => $a['db'], 'auto' => $k === 'wordpress'])->values(),
        ]);
    }

    /** Enlace antiguo /wordpress */
    public function legacy(Server $server): RedirectResponse
    {
        return redirect("/servers/{$server->id}/apps");
    }

    public function status(Request $request, Server $server, WingsClient $wings): JsonResponse
    {
        $this->authorizeServer($request, $server);
        if (Panel::demoMode()) {
            return response()->json(['state' => 'empty', 'demo' => true]);
        }
        try {
            if ($server->supportsJsApps()) {
                return response()->json($this->jsState($this->client($wings, $server, 10), $server, $this->siteHost($server)));
            }
            $state = $this->state($this->client($wings, $server, 10), $server);

            return response()->json($state['state'] === 'installed'
                ? $this->details($server, $state['app'], $state['configured'], $this->siteHost($server))
                : $state);
        } catch (ConnectionException|RequestException) {
            return response()->json(['message' => 'No se pudo consultar el servidor. ¿Está el nodo en línea?'], 502);
        }
    }

    /** Un paso de la instalación. El frontend los llama en orden y repite los que respondan wait=true. */
    public function step(Request $request, Server $server, WingsClient $wings): JsonResponse
    {
        $this->authorizeServer($request, $server);
        abort_if(Panel::demoMode(), 403, 'La instalación de aplicaciones no está disponible en la demo.');
        $host = $this->siteHost($server);
        abort_unless($host, 422, 'Este servidor no tiene dirección web.');
        if ($server->supportsJsApps()) {
            return $this->jsStep($request, $server, $wings, $host);
        }
        abort_unless(DatabaseProvisioner::enabled(), 503, 'Las bases de datos no están disponibles ahora mismo.');

        $data = $request->validate([
            'app' => 'required|in:'.implode(',', array_keys(self::APPS)),
            'step' => 'required|in:prepare,download,unpack,database,config,setup,finish',
        ]);
        $app = $data['app'];
        abort_if(in_array($data['step'], ['config', 'setup'], true) && $app !== 'wordpress', 422, 'Paso no válido para esta aplicación.');
        @set_time_limit(240);

        try {
            $client = $this->client($wings, $server);

            return match ($data['step']) {
                'prepare' => $this->prepare($client, $server, $app),
                'download' => $this->download($client, $server, $app),
                'unpack' => $this->unpack($client, $server, $app),
                'database' => $this->database($server, $app),
                'config' => $this->config($client, $server, $host),
                'setup' => $this->setup($request, $client, $wings, $server, $host),
                'finish' => response()->json($this->details($server, $app, false, $host)),
            };
        } catch (ConnectionException|RequestException $e) {
            return response()->json(['message' => 'El nodo no respondió a tiempo. Vuelve a intentarlo.'], 502);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    private function prepare(PendingRequest $client, Server $server, string $app): JsonResponse
    {
        if ($this->list($client, $server, self::ROOT) === null) {
            $client->post("/servers/{$server->uuid}/files/create-directory", ['path' => '/', 'name' => self::ROOT])->throw();
        }
        $state = $this->state($client, $server);
        $name = self::APPS[$app]['name'];

        if ($state['state'] === 'installed') {
            $current = self::APPS[$state['app']]['name'];
            if ($state['app'] === $app && ! $state['configured']) {
                return response()->json(['ok' => true, 'skip_download' => true]); // archivos ya puestos: se continúa
            }

            return response()->json(['message' => "Tu web ya tiene {$current} instalado. Para poner {$name}, vacía webroot/ desde Archivos."], 409);
        }
        if ($state['state'] === 'other') {
            return response()->json(['message' => 'webroot/ ya tiene otra web ('.implode(', ', $state['files'])."). Vacía la carpeta en Archivos si quieres instalar {$name}."], 409);
        }

        return response()->json(['ok' => true, 'skip_download' => false]);
    }

    private function archive(string $app): string
    {
        return "{$app}.".self::APPS[$app]['ext'];
    }

    private function download(PendingRequest $client, Server $server, string $app): JsonResponse
    {
        $staging = $this->list($client, $server, self::ROOT.'/'.self::STAGING);
        if ($staging === null) {
            $client->post("/servers/{$server->uuid}/files/create-directory", ['path' => '/'.self::ROOT, 'name' => self::STAGING])->throw();
            $staging = [];
        }
        if (! collect($staging)->pluck('name')->contains($this->archive($app))) {
            $package = $this->package($app);
            $stream = \GuzzleHttp\Psr7\Utils::streamFor(fopen($package, 'rb'));
            // Copia: withBody() deja el cuerpo pegado al cliente
            (clone $client)->timeout(150)->withBody($stream, 'application/octet-stream')
                ->withHeaders(['Content-Length' => (string) filesize($package)])
                ->post("/servers/{$server->uuid}/files/write?".http_build_query(['file' => '/'.self::ROOT.'/'.self::STAGING.'/'.$this->archive($app)]))
                ->throw();
        }

        return response()->json(['ok' => true]);
    }

    /** Paquete oficial en la caché local del panel (se renueva cada 24 h). */
    private function package(string $app): string
    {
        $def = self::APPS[$app];
        $dir = storage_path('app/apps');
        $file = $dir.'/'.$this->archive($app);
        if (is_file($file) && filesize($file) >= $def['min'] && filemtime($file) > time() - 86400) {
            return $file;
        }
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $tmp = $file.'.'.Str::random(6).'.part';
        try {
            $url = $def['url'] ?? $this->githubAsset(...$def['github']);
            Http::timeout(150)->withUserAgent('Cinammon-Panel/1.0')->withOptions(['sink' => $tmp])->get($url)->throw();
            if (filesize($tmp) < $def['min']) {
                throw new \RuntimeException('Paquete incompleto');
            }
            rename($tmp, $file);
        } catch (\Throwable) {
            @unlink($tmp);
            if (is_file($file)) {
                return $file; // mejor la versión de ayer que fallar
            }
            throw new \RuntimeException("No se pudo descargar {$def['name']} ahora mismo. Vuelve a intentarlo en unos minutos.");
        }

        return $file;
    }

    private function githubAsset(string $repo, string $pattern): string
    {
        $assets = Http::timeout(20)->withUserAgent('Cinammon-Panel/1.0')->acceptJson()
            ->get("https://api.github.com/repos/{$repo}/releases/latest")->throw()->json('assets') ?? [];
        foreach ($assets as $asset) {
            if (preg_match($pattern, (string) ($asset['name'] ?? ''))) {
                return (string) $asset['browser_download_url'];
            }
        }
        throw new \RuntimeException('Sin paquete');
    }

    /** Descomprime en la carpeta temporal y mueve el contenido a webroot/. */
    private function unpack(PendingRequest $client, Server $server, string $app): JsonResponse
    {
        $def = self::APPS[$app];
        $stagingDir = self::ROOT.'/'.self::STAGING;
        $archive = $this->archive($app);
        $entries = collect($this->list($client, $server, $stagingDir) ?? []);

        if ($entries->pluck('name')->reject(fn ($n) => $n === $archive)->isEmpty()) {
            if (! $entries->pluck('name')->contains($archive)) {
                throw new \RuntimeException("La descarga de {$def['name']} falló. Comprueba que tienes espacio en disco y vuelve a intentarlo.");
            }
            (clone $client)->timeout(180)->post("/servers/{$server->uuid}/files/decompress", ['root' => '/'.$stagingDir, 'file' => $archive])->throw();
            $entries = collect($this->list($client, $server, $stagingDir) ?? []);
        }

        // El paquete puede traer una carpeta (wordpress/, drupal-11.x/, matomo/…) o venir plano (Joomla)
        $content = $entries->reject(fn ($e) => $e['name'] === $archive)->values();
        $base = $stagingDir;
        $dirs = $content->filter(fn ($e) => ! empty($e['directory']))->values();
        if (! $content->pluck('name')->contains($def['check']) && $dirs->count() === 1) {
            $base .= '/'.$dirs[0]['name'];
            $content = collect($this->list($client, $server, $base) ?? []);
        }
        if (! $content->pluck('name')->contains($def['check'])) {
            throw new \RuntimeException("El paquete de {$def['name']} no es válido. Vuelve a intentarlo.");
        }

        // La página de bienvenida de Cinammon se sustituye por la app
        $root = $this->names($client, $server, self::ROOT);
        if ($root->contains('index.php') && $this->isWelcome($this->contents($client, $server, 'index.php'))) {
            $client->post("/servers/{$server->uuid}/files/delete", ['root' => '/'.self::ROOT, 'files' => ['index.php']])->throw();
        }
        $prefix = Str::after($base, self::ROOT.'/');
        $client->put("/servers/{$server->uuid}/files/rename", [
            'root' => '/'.self::ROOT,
            'files' => $content->map(fn ($e) => ['from' => $prefix.'/'.$e['name'], 'to' => $e['name']])->values()->all(),
        ])->throw();
        $client->post("/servers/{$server->uuid}/files/delete", ['root' => '/'.self::ROOT, 'files' => [self::STAGING]])->throw();
        $this->write($client, $server, self::ROOT.'/'.self::MARKER, $app);

        return response()->json(['ok' => true]);
    }

    private function appDatabase(Server $server, string $app): ?ServerDatabase
    {
        return ServerDatabase::where('server_id', $server->id)->where('database', "srv{$server->id}_{$app}")->first();
    }

    private function database(Server $server, string $app): JsonResponse
    {
        if (self::APPS[$app]['db'] && ! $this->appDatabase($server, $app)) {
            app(DatabaseProvisioner::class)->create($server, $app);
        }

        return response()->json(['ok' => true]);
    }

    private function config(PendingRequest $client, Server $server, string $host): JsonResponse
    {
        if ($this->names($client, $server, self::ROOT)->contains('wp-config.php')) {
            return response()->json(['ok' => true]);
        }
        $db = $this->appDatabase($server, 'wordpress') ?? throw new \RuntimeException('Falta la base de datos de WordPress.');
        $dbHost = config('panel.server_databases.host_for_servers').':'.config('panel.server_databases.port');
        $e = fn ($v) => var_export((string) $v, true);
        $salts = collect(['AUTH_KEY', 'SECURE_AUTH_KEY', 'LOGGED_IN_KEY', 'NONCE_KEY', 'AUTH_SALT', 'SECURE_AUTH_SALT', 'LOGGED_IN_SALT', 'NONCE_SALT'])
            ->map(fn ($k) => "define('{$k}', ".$e(Str::random(64)).');')->implode("\n");
        $url = $e("https://{$host}");

        $php = <<<PHP
<?php
/**
 * Configuración de WordPress creada por Cinammon.
 * Los datos de la base de datos también están en el panel → Bases de datos.
 */
define('DB_NAME', {$e($db->database)});
define('DB_USER', {$e($db->username)});
define('DB_PASSWORD', {$e($db->password)});
define('DB_HOST', {$e($dbHost)});
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', '');

{$salts}

\$table_prefix = 'wp_';

// La web va detrás del proxy HTTPS de Cinammon
if ((\$_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') {
    \$_SERVER['HTTPS'] = 'on';
}
if (!defined('WP_HOME')) {
    define('WP_HOME', {$url});
}
if (!defined('WP_SITEURL')) {
    define('WP_SITEURL', {$url});
}
define('FS_METHOD', 'direct');
define('WP_DEBUG', false);

if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}
require_once ABSPATH . 'wp-settings.php';
PHP;

        $this->write($client, $server, self::ROOT.'/wp-config.php', $php);

        return response()->json(['ok' => true]);
    }

    private function write(PendingRequest $client, Server $server, string $file, string $body): void
    {
        // Copia: withBody() deja el cuerpo pegado al cliente y estropearía las peticiones siguientes
        (clone $client)->withBody($body, 'application/octet-stream')->withHeaders(['Content-Length' => (string) strlen($body)])
            ->post("/servers/{$server->uuid}/files/write?".http_build_query(['file' => '/'.$file]))->throw();
    }

    /** Arranca la web si hace falta y ejecuta el instalador de WordPress con los datos del cliente. */
    private function setup(Request $request, PendingRequest $client, WingsClient $wings, Server $server, string $host): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:80',
            'user' => ['required', 'string', 'min:3', 'max:40', 'regex:/^[A-Za-z0-9._-]+$/'],
            'email' => 'required|email|max:120',
            'password' => 'required|string|min:10|max:100',
        ], [
            'user.regex' => 'El usuario solo puede tener letras, números, puntos, guiones y guiones bajos.',
            'password.min' => 'La contraseña debe tener al menos 10 caracteres.',
        ]);

        $state = $client->get("/servers/{$server->uuid}")->throw()->json('state');
        if ($state !== 'running') {
            if ($state === 'offline') {
                $wings->power($server, 'start');
            }

            return response()->json(['wait' => true, 'message' => 'Arrancando la web…']);
        }

        $token = Str::random(40);
        $file = 'cin-setup-'.Str::lower(Str::random(16)).'.php';
        $e = fn ($v) => var_export((string) $v, true);
        $script = <<<PHP
<?php
// Instalador de un solo uso creado por el panel de Cinammon. Se borra solo al ejecutarse.
if (!hash_equals({$e($token)}, (string) (\$_GET['k'] ?? ''))) { http_response_code(404); exit; }
@unlink(__FILE__);
define('WP_INSTALLING', true);
require __DIR__ . '/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/upgrade.php';
header('Content-Type: application/json');
if (is_blog_installed()) { echo json_encode(['ok' => true, 'already' => true]); exit; }
\$r = wp_install({$e($data['title'])}, {$e($data['user'])}, {$e($data['email'])}, true, '', wp_slash({$e($data['password'])}), 'es_ES');
echo json_encode(['ok' => !is_wp_error(\$r), 'error' => is_wp_error(\$r) ? \$r->get_error_message() : null]);
PHP;
        $this->write($client, $server, self::ROOT.'/'.$file, $script);

        try {
            $result = $this->callSite($server, $host, "/{$file}?k={$token}");
        } finally {
            // Por si el script no llegó a ejecutarse: que no quede en la web
            try {
                $client->post("/servers/{$server->uuid}/files/delete", ['root' => '/'.self::ROOT, 'files' => [$file]]);
            } catch (\Throwable) {
            }
        }

        if (! ($result['ok'] ?? false)) {
            throw new \RuntimeException('WordPress no se pudo instalar'.(! empty($result['error']) ? ': '.$result['error'] : '. Abre tu web para terminarlo a mano.'));
        }

        return response()->json([
            'ok' => true,
            'already' => (bool) ($result['already'] ?? false),
            'site' => "https://{$host}",
            'admin' => "https://{$host}/wp-admin/",
        ]);
    }

    /**
     * Llama a la web desde el propio servidor: primero por el nginx local (como entra el público) y,
     * si falla, directamente al puerto del contenedor.
     */
    private function callSite(Server $server, string $host, string $path): array
    {
        $local = (string) config('panel.sites_local_ip', '127.0.0.1');
        $attempts = [
            fn () => Http::withOptions(['verify' => false, 'curl' => [CURLOPT_RESOLVE => ["{$host}:443:{$local}"]]])
                ->withHeaders(['X-Forwarded-Proto' => 'https'])->timeout(90)->get("https://{$host}{$path}"),
        ];
        $server->loadMissing('allocation');
        if ($server->allocation) {
            $ip = in_array((string) $server->allocation->ip, ['', '0.0.0.0', '::'], true) ? '127.0.0.1' : (string) $server->allocation->ip;
            $attempts[] = fn () => Http::withHeaders(['Host' => $host, 'X-Forwarded-Proto' => 'https'])->timeout(90)
                ->get("http://{$ip}:{$server->allocation->port}{$path}");
        }

        foreach ($attempts as $attempt) {
            try {
                $response = $attempt();
                $json = $response->json();
                if (is_array($json) && array_key_exists('ok', $json)) {
                    return $json;
                }
            } catch (\Throwable) {
            }
        }

        throw new \RuntimeException('No se pudo contactar con tu web para terminar la instalación. Comprueba que el servidor está encendido y vuelve a pulsar Instalar.');
    }

    // ───────────────────────── Apps JavaScript (VitePress, Vite) ─────────────────────────

    /**
     * Estado de app/: empty (vacío o la bienvenida), installed (proyecto de una plantilla;
     * configured = ya compilado en dist/) u other (proyecto propio del cliente).
     */
    private function jsState(PendingRequest $client, Server $server, ?string $host): array
    {
        $names = $this->names($client, $server, self::JS_ROOT);
        if ($names->isEmpty()) {
            return ['state' => 'empty'];
        }
        if ($names->values()->all() === ['index.html']) {
            $body = (string) $client->get("/servers/{$server->uuid}/files/contents", ['file' => '/'.self::JS_ROOT.'/index.html'])->body();
            if (str_contains($body, 'Cinammon JS Apps')) {
                return ['state' => 'empty', 'welcome' => true];
            }
        }
        if ($names->contains('package.json')) {
            $pkg = json_decode((string) $client->get("/servers/{$server->uuid}/files/contents", ['file' => '/'.self::JS_ROOT.'/package.json'])->body(), true) ?: [];
            $deps = array_merge($pkg['dependencies'] ?? [], $pkg['devDependencies'] ?? []);
            $app = isset($deps['vitepress']) ? 'vitepress' : (isset($deps['vite']) ? 'vite' : null);
            if ($app) {
                $built = $names->contains('dist') && $this->names($client, $server, self::JS_ROOT.'/dist')->contains('index.html');
                $site = $host ? "https://{$host}" : null;

                return ['state' => 'installed', 'app' => $app, 'configured' => $built, 'site' => $site, 'admin' => null, 'wizard' => null, 'database' => null];
            }
        }

        return ['state' => 'other', 'files' => $names->take(8)->values()->all()];
    }

    private function jsStep(Request $request, Server $server, WingsClient $wings, string $host): JsonResponse
    {
        $data = $request->validate([
            'app' => 'required|in:'.implode(',', array_keys(self::JS_APPS)),
            'step' => 'required|in:prepare,configure,reinstall,wait_install,start,wait_site',
        ]);
        $app = $data['app'];
        $name = self::JS_APPS[$app]['name'];
        // Reinstalar reescribe el arranque: como en ServerController::reinstall, solo dueño o admin
        $user = $request->user();
        abort_unless($user->id === $server->owner_id || $user->hasAnyRole(['Owner', 'Admin']), 403, 'Solo el dueño del servidor puede instalar plantillas.');

        try {
            $client = $this->client($wings, $server);

            switch ($data['step']) {
                case 'prepare':
                    $state = $this->jsState($client, $server, $host);
                    if ($state['state'] === 'installed' && $state['app'] !== $app) {
                        return response()->json(['message' => 'Tu servidor ya tiene un proyecto '.self::JS_APPS[$state['app']]['name'].'. Vacía app/ desde Archivos para cambiarlo.'], 409);
                    }
                    if ($state['state'] === 'other') {
                        return response()->json(['message' => 'app/ ya tiene tu propio proyecto ('.implode(', ', $state['files']).'). Para no borrar nada, la plantilla solo se instala en un servidor vacío.'], 409);
                    }

                    return response()->json(['ok' => true, 'skip_install' => $state['state'] === 'installed']);

                case 'configure':
                    $vars = $request->validate(['title' => 'required|string|max:60'])['title'];
                    $this->setVariable($server, 'TEMPLATE', $app);
                    $this->setVariable($server, 'SITE_NAME', $vars);
                    $this->setVariable($server, 'APP_MODE', 'static');

                    return response()->json(['ok' => true]);

                case 'reinstall':
                    // Reinstalar no borra app/: regenera el arranque, que crea el proyecto al arrancar
                    // Wings rechaza reinstalar mientras el servidor se apaga: se espera a que esté parado
                    for ($i = 0; $i < 20; $i++) {
                        $power = $client->get("/servers/{$server->uuid}")->throw()->json('state');
                        if ($power === 'offline') {
                            break;
                        }
                        if ($i === 0) {
                            $wings->power($server, 'kill');
                        }
                        usleep(500_000);
                    }
                    // Antes de pedirlo: Wings marca «instalado» al terminar y no hay que pisarlo
                    $installedAt = $server->installed_at;
                    $server->forceFill(['installed_at' => null, 'status' => false])->save();
                    try {
                        $wings->reinstall($server);
                    } catch (\Throwable $e) {
                        $server->forceFill(['installed_at' => $installedAt])->save();
                        throw $e;
                    }

                    return response()->json(['ok' => true]);

                case 'wait_install':
                    return response()->json($server->fresh()->installed_at ? ['ok' => true] : ['wait' => true, 'message' => 'Preparando el entorno…']);

                case 'start':
                    $state = $client->get("/servers/{$server->uuid}")->throw()->json('state');
                    if ($state === 'running') {
                        $wings->power($server, 'restart');
                    } elseif ($state !== 'starting') {
                        $wings->power($server, 'start');
                    }

                    return response()->json(['ok' => true]);

                case 'wait_site':
                    $state = $this->jsState($client, $server, $host);
                    $power = $client->get("/servers/{$server->uuid}")->throw()->json('state');
                    if ($state['state'] === 'installed' && $state['configured'] && $power === 'running') {
                        return response()->json($state);
                    }
                    if ($power === 'offline') {
                        return response()->json(['message' => "El servidor se detuvo mientras se creaba {$name}. Mira la Consola para ver el error y vuelve a pulsar Instalar."], 422);
                    }

                    return response()->json(['wait' => true, 'message' => $state['state'] === 'installed'
                        ? 'Instalando dependencias y compilando… (la primera vez tarda 1-2 minutos)'
                        : "Creando el proyecto {$name}…"]);
            }
        } catch (ConnectionException|RequestException) {
            return response()->json(['message' => 'El nodo no respondió a tiempo. Vuelve a intentarlo.'], 502);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        abort(422);
    }

    private function setVariable(Server $server, string $env, string $value): void
    {
        $variable = \App\Models\EggVariable::where('egg_id', $server->egg_id)->where('env_variable', $env)->first();
        if (! $variable) {
            throw new \RuntimeException('Este servidor usa una versión antigua del egg. Pide a un administrador que lo actualice.');
        }
        \Illuminate\Support\Facades\DB::table('server_variables')->updateOrInsert(
            ['server_id' => $server->id, 'variable_id' => $variable->id],
            ['variable_value' => $value, 'updated_at' => now(), 'created_at' => now()]
        );
    }
}
