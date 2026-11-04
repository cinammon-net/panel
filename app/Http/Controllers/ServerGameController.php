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
use Inertia\Inertia;

/**
 * Ajustes del juego de los servidores de Minecraft Java: formulario para server.properties
 * (solo claves conocidas y validadas, el resto del archivo no se toca) e icono del servidor.
 */
class ServerGameController extends Controller
{
    /** clave => [tipo, grupo, etiqueta, ayuda, opciones/limites] */
    private const FIELDS = [
        'motd' => ['text', 'general', 'Nombre del servidor (MOTD)', 'Lo que ven los jugadores en la lista de servidores. Admite colores con &.', ['max' => 150]],
        'max-players' => ['int', 'general', 'Máximo de jugadores', null, ['min' => 1, 'max' => 1000]],
        'online-mode' => ['bool', 'general', 'Solo cuentas originales (premium)', 'Si lo desactivas pueden entrar cuentas no premium; cualquiera podría usar el nombre de otro.', []],
        'hide-online-players' => ['bool', 'general', 'Ocultar la lista de jugadores conectados', null, []],
        'player-idle-timeout' => ['int', 'general', 'Expulsar por inactividad (minutos)', '0 = nunca.', ['min' => 0, 'max' => 1440]],
        'gamemode' => ['enum', 'juego', 'Modo de juego', null, ['options' => ['survival' => 'Supervivencia', 'creative' => 'Creativo', 'adventure' => 'Aventura', 'spectator' => 'Espectador']]],
        'force-gamemode' => ['bool', 'juego', 'Forzar el modo de juego al entrar', null, []],
        'difficulty' => ['enum', 'juego', 'Dificultad', null, ['options' => ['peaceful' => 'Pacífico', 'easy' => 'Fácil', 'normal' => 'Normal', 'hard' => 'Difícil']]],
        'hardcore' => ['bool', 'juego', 'Modo extremo (hardcore)', 'Al morir, el jugador pasa a espectador.', []],
        'pvp' => ['bool', 'juego', 'PvP (jugadores pueden atacarse)', null, []],
        'allow-flight' => ['bool', 'juego', 'Permitir volar', 'Evita expulsiones por "volar" con plugins o mods que lo permiten.', []],
        'enable-command-block' => ['bool', 'juego', 'Bloques de comandos', null, []],
        'spawn-protection' => ['int', 'juego', 'Protección del spawn (bloques)', '0 = sin protección. Los OP pueden construir igualmente.', ['min' => 0, 'max' => 512]],
        'level-seed' => ['text', 'mundo', 'Semilla del mundo', 'Solo se usa al crear un mundo nuevo.', ['max' => 64]],
        'generate-structures' => ['bool', 'mundo', 'Generar estructuras (aldeas, templos...)', 'Solo afecta a zonas nuevas del mapa.', []],
        'allow-nether' => ['bool', 'mundo', 'Permitir el Nether', null, []],
        'spawn-monsters' => ['bool', 'mundo', 'Aparecen monstruos', null, []],
        'spawn-animals' => ['bool', 'mundo', 'Aparecen animales', null, []],
        'spawn-npcs' => ['bool', 'mundo', 'Aparecen aldeanos', null, []],
        'view-distance' => ['int', 'rendimiento', 'Distancia de visión (chunks)', 'Más alto = se ve más lejos pero consume más RAM y CPU. Recomendado 8-12.', ['min' => 3, 'max' => 32]],
        'simulation-distance' => ['int', 'rendimiento', 'Distancia de simulación (chunks)', 'Hasta dónde se mueven mobs, cultivos y redstone. Recomendado 6-10.', ['min' => 3, 'max' => 32]],
        'enforce-secure-profile' => ['bool', 'chat', 'Exigir chat firmado', 'Desactívalo si los jugadores no pueden escribir en el chat (por ejemplo con cuentas no premium).', []],
        'resource-pack' => ['url', 'chat', 'Paquete de recursos (URL)', 'Enlace directo a un .zip. Vacío = ninguno.', ['max' => 500]],
        'require-resource-pack' => ['bool', 'chat', 'Obligar a usar el paquete de recursos', null, []],
    ];

    /** Siempre se muestran (se añaden al archivo si faltan). El resto, solo si el servidor las tiene. */
    private const ALWAYS = ['motd', 'max-players', 'online-mode', 'gamemode', 'difficulty', 'view-distance'];

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
        abort_unless(MinecraftAddons::hasPlayerLists($server), 404, 'Esta sección solo existe en servidores de Minecraft Java.');
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

    // ---------------------------------------------------------------
    // Formato .properties de Java (\uXXXX, \:, \=, \\)
    // ---------------------------------------------------------------

    private static function decode(string $value): string
    {
        return preg_replace_callback('/\\\\(u[0-9a-fA-F]{4}|.)/s', function ($m) {
            $c = $m[1];
            if ($c[0] === 'u' && strlen($c) === 5) {
                return mb_chr(hexdec(substr($c, 1)), 'UTF-8');
            }

            return match ($c) { 'n' => "\n", 't' => "\t", 'r' => "\r", 'f' => "\f", default => $c };
        }, $value);
    }

    private static function encode(string $value): string
    {
        $out = '';
        foreach (mb_str_split($value) as $i => $ch) {
            $code = mb_ord($ch, 'UTF-8');
            $out .= match (true) {
                $ch === '\\' => '\\\\',
                $ch === "\n" => '\\n',
                $ch === "\t" => '\\t',
                $ch === "\r" => '\\r',
                $ch === ':' || $ch === '=' || $ch === '#' || $ch === '!' => '\\'.$ch,
                $ch === ' ' && $i === 0 => '\\ ',
                $code < 0x20 || $code > 0x7e => $code > 0xFFFF ? '' : sprintf('\\u%04X', $code),
                default => $ch,
            };
        }

        return $out;
    }

    /** @return array<string,string> */
    private static function parse(string $content): array
    {
        $values = [];
        foreach (preg_split('/\r?\n/', $content) as $line) {
            $trim = ltrim($line);
            if ($trim === '' || $trim[0] === '#' || $trim[0] === '!') {
                continue;
            }
            if (preg_match('/^((?:\\\\.|[^=:\\\\])*?)\s*[=:]\s*(.*)$/', $trim, $m)) {
                $values[self::decode(trim($m[1]))] = self::decode($m[2]);
            }
        }

        return $values;
    }

    private function readProperties($client, Server $server): ?string
    {
        $response = $client->get('/servers/'.$server->uuid.'/files/contents', ['file' => '/server.properties']);

        return $response->successful() ? $response->body() : null;
    }

    public function page(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        return Inertia::render('Servers/Game', [
            'server' => ['id' => $server->id, 'name' => $server->name, 'owner_id' => $server->owner_id, 'egg' => $server->egg?->name],
        ]);
    }

    public function show(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        try {
            $client = $wings->forServer($server)->timeout(10);
            $content = $this->readProperties($client, $server);
            $values = $content === null ? [] : self::parse($content);

            $fields = [];
            foreach (self::FIELDS as $key => [$type, $group, $label, $help, $extra]) {
                if (! array_key_exists($key, $values) && ! in_array($key, self::ALWAYS, true)) {
                    continue;
                }
                $raw = $values[$key] ?? '';
                $fields[] = [
                    'key' => $key,
                    'type' => $type,
                    'group' => $group,
                    'label' => $label,
                    'help' => $help,
                    'options' => $extra['options'] ?? null,
                    'min' => $extra['min'] ?? null,
                    'max' => $extra['max'] ?? null,
                    'value' => match ($type) {
                        'bool' => strtolower(trim($raw)) === 'true',
                        'int' => $raw === '' ? null : (int) $raw,
                        default => $raw,
                    },
                ];
            }

            $icon = null;
            $root = collect($client->get('/servers/'.$server->uuid.'/files/list-directory', ['directory' => '/'])->throw()->json() ?? []);
            $iconEntry = $root->firstWhere('name', 'server-icon.png');
            if ($iconEntry && ! ($iconEntry['symlink'] ?? false) && (int) ($iconEntry['size'] ?? 0) <= 256 * 1024) {
                $png = $client->get('/servers/'.$server->uuid.'/files/contents', ['file' => '/server-icon.png']);
                if ($png->successful() && str_starts_with($png->body(), "\x89PNG")) {
                    $icon = 'data:image/png;base64,'.base64_encode($png->body());
                }
            }

            $state = $client->get('/servers/'.$server->uuid)->json('state');

            return response()->json(['exists' => $content !== null, 'fields' => $fields, 'icon' => $icon, 'running' => $state === 'running']);
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo conectar con el nodo.'], 502);
        }
    }

    public function update(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $input = $request->validate(['values' => 'required|array|max:40'])['values'];

        $changes = [];
        foreach ($input as $key => $value) {
            abort_unless(is_string($key) && isset(self::FIELDS[$key]), 422, 'Ajuste no permitido: '.$key);
            [$type, , $label, , $extra] = self::FIELDS[$key];
            $changes[$key] = match ($type) {
                'bool' => filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? abort(422, $label.': valor no válido.'),
                'int' => (function () use ($value, $extra, $label) {
                    abort_unless(is_numeric($value) && (int) $value == $value && $value >= $extra['min'] && $value <= $extra['max'], 422, "{$label}: entre {$extra['min']} y {$extra['max']}.");

                    return (string) (int) $value;
                })(),
                'enum' => array_key_exists((string) $value, $extra['options']) ? (string) $value : abort(422, $label.': opción no válida.'),
                'url' => (function () use ($value, $extra, $label) {
                    $v = trim((string) $value);
                    abort_unless($v === '' || (strlen($v) <= $extra['max'] && preg_match('#^https?://[^\s]+$#i', $v)), 422, $label.': escribe un enlace http(s) válido.');

                    return $v;
                })(),
                default => (function () use ($value, $extra, $label) {
                    $v = str_replace(["\r\n", "\r"], "\n", (string) $value);
                    abort_if(mb_strlen($v) > $extra['max'] || preg_match('/[\x00-\x09\x0b-\x1f\x7f]/', $v), 422, $label.': texto no válido.');

                    return $v;
                })(),
            };
            if ($type === 'bool') {
                $changes[$key] = $changes[$key] ? 'true' : 'false';
            }
        }
        // El MOTD usa § para los colores; en el panel se escribe & (como en los plugins).
        if (isset($changes['motd'])) {
            $changes['motd'] = preg_replace('/&([0-9a-fk-or])/i', '§$1', $changes['motd']);
            abort_if(substr_count($changes['motd'], "\n") > 1, 422, 'El MOTD admite como mucho 2 líneas.');
        }

        try {
            $client = $wings->forServer($server)->timeout(15);
            $content = $this->readProperties($client, $server) ?? "#Minecraft server properties\n";
            $lines = preg_split('/\r?\n/', rtrim($content, "\r\n"));
            $pending = $changes;
            foreach ($lines as $i => $line) {
                $trim = ltrim($line);
                if ($trim === '' || $trim[0] === '#' || $trim[0] === '!') {
                    continue;
                }
                if (preg_match('/^((?:\\\\.|[^=:\\\\])*?)\s*[=:]/', $trim, $m)) {
                    $key = self::decode(trim($m[1]));
                    if (array_key_exists($key, $pending)) {
                        $lines[$i] = $key.'='.self::encode($pending[$key]);
                        unset($pending[$key]);
                    }
                }
            }
            foreach ($pending as $key => $value) {
                $lines[] = $key.'='.self::encode($value);
            }
            $body = implode("\n", $lines)."\n";
            $client->withBody($body, 'text/plain')->withHeaders(['Content-Length' => (string) strlen($body)])
                ->post('/servers/'.$server->uuid.'/files/write?'.http_build_query(['file' => '/server.properties']))->throw();
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo guardar server.properties.'], 502);
        }

        $this->logActivity($server, $request, 'game:settings', 'Cambió ajustes del juego: '.implode(', ', array_keys($changes)));

        return response()->json(['saved' => array_keys($changes)]);
    }

    public function schedule(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);
        $schedule = \App\Models\ServerSchedule::where('server_id', $server->id)->where('action', 'restart')->first();

        return response()->json([
            'enabled' => (bool) ($schedule?->enabled ?? false),
            'time' => $schedule?->time ?? '05:00',
            'days' => $schedule?->days ?? [],
            'warn' => (bool) ($schedule?->warn ?? true),
            'last_run_at' => $schedule?->last_run_at?->toIso8601String(),
        ]);
    }

    public function saveSchedule(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);
        $data = $request->validate([
            'enabled' => 'required|boolean',
            'time' => ['required', 'string', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'days' => 'present|array|max:7',
            'days.*' => 'integer|between:0,6|distinct',
            'warn' => 'required|boolean',
        ]);
        $days = array_values(array_map('intval', $data['days']));
        sort($days);
        \App\Models\ServerSchedule::updateOrCreate(
            ['server_id' => $server->id, 'action' => 'restart'],
            ['enabled' => $data['enabled'], 'time' => $data['time'], 'days' => count($days) === 7 ? [] : $days, 'warn' => $data['warn']],
        );
        $this->logActivity($server, $request, 'schedule:restart', $data['enabled'] ? "Reinicio automático a las {$data['time']}" : 'Desactivó el reinicio automático');

        return response()->json(['saved' => true]);
    }

    public function uploadIcon(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $request->validate(['icon' => 'required|file|max:4096|mimes:png,jpg,jpeg,webp,gif']);
        $data = @file_get_contents($request->file('icon')->getRealPath());
        $src = $data !== false ? @imagecreatefromstring($data) : false;
        abort_unless($src, 422, 'La imagen no es válida.');

        // Recorte cuadrado centrado y redimensionado a 64x64, que es lo que exige Minecraft.
        $w = imagesx($src);
        $h = imagesy($src);
        $side = min($w, $h);
        $dst = imagecreatetruecolor(64, 64);
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        imagefill($dst, 0, 0, imagecolorallocatealpha($dst, 0, 0, 0, 127));
        imagecopyresampled($dst, $src, 0, 0, intdiv($w - $side, 2), intdiv($h - $side, 2), 64, 64, $side, $side);
        ob_start();
        imagepng($dst, null, 9);
        $png = ob_get_clean();
        imagedestroy($src);
        imagedestroy($dst);

        try {
            $wings->forServer($server)->timeout(15)->withBody($png, 'image/png')->withHeaders(['Content-Length' => (string) strlen($png)])
                ->post('/servers/'.$server->uuid.'/files/write?'.http_build_query(['file' => '/server-icon.png']))->throw();
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo guardar el icono.'], 502);
        }
        $this->logActivity($server, $request, 'game:icon', 'Cambió el icono del servidor');

        return response()->json(['icon' => 'data:image/png;base64,'.base64_encode($png)]);
    }

    public function deleteIcon(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        try {
            $wings->forServer($server)->post('/servers/'.$server->uuid.'/files/delete', ['root' => '/', 'files' => ['server-icon.png']])->throw();
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo borrar el icono.'], 502);
        }
        $this->logActivity($server, $request, 'game:icon', 'Quitó el icono del servidor');

        return response()->noContent();
    }
}
