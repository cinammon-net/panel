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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * WordPress con un clic para el hosting web: crea la base de datos, descarga WordPress en
 * webroot/, escribe wp-config.php y ejecuta el instalador con los datos del cliente.
 * Va por pasos (cada uno es una petición corta) para que se vea el progreso y no caduque.
 */
class ServerWordpressController extends Controller
{
    private const PACKAGE = 'https://es.wordpress.org/latest-es_ES.tar.gz';
    private const ARCHIVE = 'cin-wordpress.tar.gz';
    private const ROOT = 'webroot';

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
        abort_unless($server->supportsWordpress(), 404, 'WordPress solo está disponible en el hosting web con PHP.');
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

    /**
     * Estado de webroot/: empty (vacío o solo la bienvenida), files (WordPress descargado sin configurar),
     * configured (wp-config.php ya existe) u other (hay otra web: no se toca).
     */
    private function state(PendingRequest $client, Server $server): array
    {
        $entries = $this->list($client, $server, self::ROOT);
        $names = collect($entries ?? [])->pluck('name');
        $visible = $names->reject(fn ($n) => in_array($n, [self::ARCHIVE, 'wordpress'], true) || str_starts_with($n, 'cin-setup-'));

        if ($names->contains('wp-config.php')) {
            return ['state' => 'configured'];
        }
        if ($names->contains('wp-settings.php') && $names->contains('wp-includes')) {
            return ['state' => 'files'];
        }
        if ($visible->isEmpty()) {
            return ['state' => 'empty'];
        }
        if ($visible->values()->all() === ['index.php']) {
            $body = $client->get("/servers/{$server->uuid}/files/contents", ['file' => '/'.self::ROOT.'/index.php'])->body();
            if (str_contains($body, 'Cinammon WebHost') || str_contains($body, 'Berny WebHost')) {
                return ['state' => 'empty', 'welcome' => true];
            }
        }

        return ['state' => 'other', 'files' => $visible->take(8)->values()->all()];
    }

    public function page(Request $request, Server $server): Response
    {
        $this->authorizeServer($request, $server);
        $host = $this->siteHost($server);

        return Inertia::render('Servers/Wordpress', [
            'server' => ['id' => $server->id, 'name' => $server->name, 'owner_id' => $server->owner_id],
            'site' => $host ? "https://{$host}" : null,
            'available' => ! Panel::demoMode() && DatabaseProvisioner::enabled() && $host !== null,
            'demo' => Panel::demoMode(),
            'ownerEmail' => $server->owner?->email,
        ]);
    }

    public function status(Request $request, Server $server, WingsClient $wings): JsonResponse
    {
        $this->authorizeServer($request, $server);
        if (Panel::demoMode()) {
            return response()->json(['state' => 'empty', 'demo' => true]);
        }
        try {
            return response()->json($this->state($this->client($wings, $server, 10), $server));
        } catch (ConnectionException|RequestException) {
            return response()->json(['message' => 'No se pudo consultar el servidor. ¿Está el nodo en línea?'], 502);
        }
    }

    /** Un paso de la instalación. El frontend los llama en orden y repite los que respondan wait=true. */
    public function step(Request $request, Server $server, WingsClient $wings): JsonResponse
    {
        $this->authorizeServer($request, $server);
        abort_if(Panel::demoMode(), 403, 'La instalación de WordPress no está disponible en la demo.');
        abort_unless(DatabaseProvisioner::enabled(), 503, 'Las bases de datos no están disponibles ahora mismo.');
        $host = $this->siteHost($server);
        abort_unless($host, 422, 'Este servidor no tiene dirección web.');

        $data = $request->validate(['step' => 'required|in:prepare,download,unpack,database,config,setup']);
        @set_time_limit(240);

        try {
            $client = $this->client($wings, $server);

            return match ($data['step']) {
                'prepare' => $this->prepare($client, $server),
                'download' => $this->download($client, $server),
                'unpack' => $this->unpack($client, $server),
                'database' => $this->database($server),
                'config' => $this->config($client, $server, $host),
                'setup' => $this->setup($request, $client, $wings, $server, $host),
            };
        } catch (ConnectionException|RequestException $e) {
            return response()->json(['message' => 'El nodo no respondió a tiempo. Vuelve a intentarlo.'], 502);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    private function prepare(PendingRequest $client, Server $server): JsonResponse
    {
        if ($this->list($client, $server, self::ROOT) === null) {
            $client->post("/servers/{$server->uuid}/files/create-directory", ['path' => '/', 'name' => self::ROOT])->throw();
        }
        $state = $this->state($client, $server);

        return match ($state['state']) {
            'configured' => response()->json(['message' => 'Ya hay un WordPress configurado en webroot/. Ábrelo desde tu web.'], 409),
            'other' => response()->json(['message' => 'webroot/ ya tiene otra web ('.implode(', ', $state['files']).'). Vacía la carpeta en Archivos si quieres instalar WordPress.'], 409),
            default => response()->json(['ok' => true, 'skip_download' => $state['state'] === 'files']),
        };
    }

    /**
     * Wings tiene desactivadas las descargas remotas, así que el panel baja WordPress una vez al
     * día (caché local) y lo sube al servidor directamente.
     */
    private function download(PendingRequest $client, Server $server): JsonResponse
    {
        $names = collect($this->list($client, $server, self::ROOT) ?? [])->pluck('name');
        if (! $names->contains(self::ARCHIVE)) {
            $package = $this->package();
            $stream = \GuzzleHttp\Psr7\Utils::streamFor(fopen($package, 'rb'));
            (clone $client)->timeout(120)->withBody($stream, 'application/octet-stream')
                ->withHeaders(['Content-Length' => (string) filesize($package)])
                ->post("/servers/{$server->uuid}/files/write?".http_build_query(['file' => '/'.self::ROOT.'/'.self::ARCHIVE]))
                ->throw();
        }

        return response()->json(['ok' => true]);
    }

    /** Ruta local del paquete oficial de WordPress en español, renovado cada 24 h. */
    private function package(): string
    {
        $dir = storage_path('app/wordpress');
        $file = $dir.'/latest-es_ES.tar.gz';
        if (is_file($file) && filesize($file) > 5_000_000 && filemtime($file) > time() - 86400) {
            return $file;
        }
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $tmp = $file.'.'.Str::random(6).'.part';
        try {
            Http::timeout(120)->withUserAgent('Cinammon-Panel/1.0')->withOptions(['sink' => $tmp])->get(self::PACKAGE)->throw();
            if (filesize($tmp) < 5_000_000) {
                throw new \RuntimeException('El paquete descargado de WordPress está incompleto.');
            }
            rename($tmp, $file);
        } catch (\Throwable $e) {
            @unlink($tmp);
            if (is_file($file)) {
                return $file; // mejor una versión de ayer que fallar
            }
            throw new \RuntimeException('No se pudo descargar WordPress ahora mismo. Vuelve a intentarlo en unos minutos.');
        }

        return $file;
    }

    /** Descomprime el paquete subido y mueve wordpress/* a webroot/. */
    private function unpack(PendingRequest $client, Server $server): JsonResponse
    {
        $names = collect($this->list($client, $server, self::ROOT) ?? [])->pluck('name');
        if (! $names->contains('wordpress')) {
            if (! $names->contains(self::ARCHIVE)) {
                throw new \RuntimeException('La descarga de WordPress falló. Comprueba que tienes espacio en disco y vuelve a intentarlo.');
            }
            $client->timeout(110)->post("/servers/{$server->uuid}/files/decompress", ['root' => '/'.self::ROOT, 'file' => self::ARCHIVE])->throw();
        }

        $inner = $this->list($client, $server, self::ROOT.'/wordpress') ?? [];
        if (! collect($inner)->pluck('name')->contains('wp-settings.php')) {
            throw new \RuntimeException('El paquete de WordPress no es válido. Vuelve a intentarlo.');
        }
        // La página de bienvenida de Cinammon se sustituye por WordPress
        $remove = $names->contains('index.php') ? ['index.php'] : [];
        if ($remove) {
            $client->post("/servers/{$server->uuid}/files/delete", ['root' => '/'.self::ROOT, 'files' => $remove])->throw();
        }
        $client->put("/servers/{$server->uuid}/files/rename", [
            'root' => '/'.self::ROOT,
            'files' => collect($inner)->map(fn ($e) => ['from' => 'wordpress/'.$e['name'], 'to' => $e['name']])->values()->all(),
        ])->throw();
        $client->post("/servers/{$server->uuid}/files/delete", ['root' => '/'.self::ROOT, 'files' => ['wordpress', self::ARCHIVE]])->throw();

        return response()->json(['ok' => true]);
    }

    private function wordpressDatabase(Server $server): ?ServerDatabase
    {
        return ServerDatabase::where('server_id', $server->id)->where('database', "srv{$server->id}_wordpress")->first();
    }

    private function database(Server $server): JsonResponse
    {
        if (! $this->wordpressDatabase($server)) {
            app(DatabaseProvisioner::class)->create($server, 'wordpress');
        }

        return response()->json(['ok' => true]);
    }

    private function config(PendingRequest $client, Server $server, string $host): JsonResponse
    {
        $names = collect($this->list($client, $server, self::ROOT) ?? [])->pluck('name');
        if ($names->contains('wp-config.php')) {
            return response()->json(['ok' => true]);
        }
        $db = $this->wordpressDatabase($server) ?? throw new \RuntimeException('Falta la base de datos de WordPress.');
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
}
