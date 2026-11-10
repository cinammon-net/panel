<?php

namespace App\Support;

use App\Models\Server;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Servidores multijugador de GTA (y RedM, que usa la misma plataforma que FiveM):
 * jugadores conectados por el protocolo de consulta de cada uno y lista de mods/resources.
 *
 *   mta     → Multi Theft Auto: consulta ASE (UDP, puerto del juego + 123)
 *   samp    → SA-MP y open.mp: consulta SA-MP (UDP, mismo puerto)
 *   cfx     → FiveM y RedM: /players.json y /info.json (HTTP, mismo puerto)
 *   altv, ragemp, ragecoop, gtac → sin consulta pública: solo mods
 */
class GtaServers
{
    private const KINDS = [
        'mta' => ['multi theft auto', 'mta:sa', 'mtasa'],
        'samp' => ['sa-mp', 'samp', 'openmp', 'open.mp'],
        'cfx' => ['fivem', 'redm', 'txadmin'],
        'altv' => ['alt:v', 'altv'],
        'ragecoop' => ['ragecoop'],
        'ragemp' => ['rage.mp', 'ragemp'],
        'gtac' => ['grand theft auto connected', 'gta connected'],
    ];

    /** Puerto de la consulta ASE de MTA respecto al puerto del juego. */
    public const ASE_OFFSET = 123;

    public static function kind(?Server $server): ?string
    {
        $name = strtolower((string) $server?->egg?->name);
        if ($name === '') {
            return null;
        }
        foreach (self::KINDS as $kind => $words) {
            foreach ($words as $word) {
                if (str_contains($name, $word)) {
                    return $kind;
                }
            }
        }

        return null;
    }

    /** Juegos con lista de jugadores en directo. */
    public static function hasLivePlayers(?Server $server): bool
    {
        return in_array(self::kind($server), ['mta', 'samp', 'cfx'], true);
    }

    /** Qué acciones admite la consola de cada juego. */
    public static function actions(?string $kind): array
    {
        return match ($kind) {
            'mta' => ['kick', 'ban'],
            'samp' => ['kick', 'ban'],
            'cfx' => ['kick'],
            default => [],
        };
    }

    /** Comando de consola para expulsar/banear. MTA usa el nombre; SA-MP y FiveM el id del jugador. */
    public static function command(string $kind, string $action, string $name, ?int $id, string $reason): ?string
    {
        return match ([$kind, $action]) {
            ['mta', 'kick'] => trim("kick {$name} {$reason}"),
            ['mta', 'ban'] => trim("ban {$name} {$reason}"),
            ['samp', 'kick'] => $id !== null ? "kick {$id}" : null,
            ['samp', 'ban'] => $id !== null ? "ban {$id}" : null,
            ['cfx', 'kick'] => $id !== null ? trim("clientkick {$id} ".($reason ?: 'Expulsado desde el panel')) : null,
            default => null,
        };
    }

    /**
     * Jugadores conectados.
     *
     * @return array{online:int,max:int,players:array<int,array{id:?int,name:string,score:?int,ping:?int}>,hostname:?string,gamemode:?string,map:?string,version:?string}|null
     */
    public static function query(Server $server, int $cacheSeconds = 5): ?array
    {
        $kind = self::kind($server);
        $allocation = $server->allocation;
        if (! $allocation || ! self::hasLivePlayers($server)) {
            return null;
        }
        $host = in_array((string) $allocation->ip, ['', '0.0.0.0', '::'], true) ? '127.0.0.1' : (string) $allocation->ip;
        $port = (int) $allocation->port;

        return Cache::remember('gta_query:'.$server->id, now()->addSeconds($cacheSeconds), function () use ($kind, $host, $port) {
            try {
                return match ($kind) {
                    'mta' => self::ase($host, $port + self::ASE_OFFSET),
                    'samp' => self::samp($host, $port),
                    'cfx' => self::cfx($host, $port),
                } ?? false;
            } catch (\Throwable) {
                return false;
            }
        }) ?: null;
    }

    /** Envía un datagrama UDP y devuelve la respuesta (o null si no contesta). */
    private static function udp(string $host, int $port, string $payload, float $timeout = 1.5): ?string
    {
        $socket = @stream_socket_client('udp://'.(str_contains($host, ':') ? "[{$host}]" : $host).':'.$port, $errno, $errstr, $timeout);
        if (! $socket) {
            return null;
        }
        stream_set_timeout($socket, (int) floor($timeout), (int) (($timeout - floor($timeout)) * 1e6));
        try {
            fwrite($socket, $payload);
            $data = fread($socket, 65535);

            return $data === false || $data === '' ? null : $data;
        } finally {
            fclose($socket);
        }
    }

    /** Quita los códigos de color de MTA (#RRGGBB) y los de SA-MP ({RRGGBB}). */
    private static function clean(string $text, int $max = 64): string
    {
        $text = preg_replace('/#[0-9a-fA-F]{6}|\{[0-9a-fA-F]{6}\}/', '', $text) ?? $text;
        $text = trim(preg_replace('/[\x00-\x1f\x7f]+/', '', $text) ?? $text);

        return mb_substr(mb_convert_encoding($text, 'UTF-8', 'UTF-8, ISO-8859-1'), 0, $max);
    }

    /** All-Seeing Eye (MTA:SA). */
    private static function ase(string $host, int $port): ?array
    {
        $data = self::udp($host, $port, 's');
        if ($data === null || ! str_starts_with($data, 'EYE1')) {
            return null;
        }
        $offset = 4;
        // Cadena ASE: 1 byte de longitud (incluye el propio byte) + texto.
        $read = function () use ($data, &$offset): ?string {
            if ($offset >= strlen($data)) {
                return null;
            }
            $len = ord($data[$offset]);
            $value = $len > 1 ? substr($data, $offset + 1, $len - 1) : '';
            $offset += max(1, $len);

            return $value;
        };
        $fields = [];
        foreach (['game', 'port', 'name', 'gametype', 'map', 'version', 'password', 'online', 'max'] as $key) {
            $fields[$key] = $read();
        }
        // Reglas clave/valor hasta una cadena vacía.
        while ($offset < strlen($data)) {
            $key = $read();
            if ($key === null || $key === '') {
                break;
            }
            $read();
        }
        $players = [];
        while ($offset < strlen($data) && count($players) < 512) {
            $flags = ord($data[$offset++]);
            $p = ['id' => null, 'name' => '', 'score' => null, 'ping' => null];
            if ($flags & 1) {
                $p['name'] = self::clean((string) $read());
            }
            if ($flags & 2) {
                $read(); // equipo
            }
            if ($flags & 4) {
                $read(); // skin
            }
            if ($flags & 8) {
                $p['score'] = (int) $read();
            }
            if ($flags & 16) {
                $p['ping'] = (int) $read();
            }
            if ($flags & 32) {
                $read(); // tiempo
            }
            if ($p['name'] !== '') {
                $players[] = $p;
            }
        }

        return [
            'online' => (int) $fields['online'],
            'max' => (int) $fields['max'],
            'players' => $players,
            'hostname' => self::clean((string) $fields['name'], 120) ?: null,
            'gamemode' => self::clean((string) $fields['gametype']) ?: null,
            'map' => self::clean((string) $fields['map']) ?: null,
            'version' => $fields['version'] ? 'MTA:SA '.self::clean((string) $fields['version']) : null,
        ];
    }

    /** Consulta de SA-MP / open.mp. */
    private static function samp(string $host, int $port): ?array
    {
        $ip = filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) ?: '127.0.0.1';
        $head = 'SAMP'.implode('', array_map('chr', array_map('intval', explode('.', $ip)))).pack('v', $port);

        $info = self::udp($host, $port, $head.'i');
        if ($info === null || strlen($info) < 16) {
            return null;
        }
        $o = 11;
        $o++; // con contraseña
        $online = unpack('v', substr($info, $o, 2))[1];
        $o += 2;
        $max = unpack('v', substr($info, $o, 2))[1];
        $o += 2;
        $str = function () use ($info, &$o): string {
            $len = unpack('V', substr($info, $o, 4) ?: "\0\0\0\0")[1];
            $o += 4;
            $value = substr($info, $o, min($len, 1024));
            $o += $len;

            return $value;
        };
        $hostname = $str();
        $gamemode = $str();
        $language = $str();

        // 'd' = id, nombre, puntos y ping. El servidor solo responde con menos de 100 jugadores.
        $players = [];
        if ($online > 0 && $online < 100 && ($list = self::udp($host, $port, $head.'d')) !== null && strlen($list) >= 13) {
            $o = 11;
            $count = unpack('v', substr($list, $o, 2))[1];
            $o += 2;
            for ($i = 0; $i < $count && $o < strlen($list); $i++) {
                $id = ord($list[$o++]);
                $len = ord($list[$o++]);
                $name = substr($list, $o, $len);
                $o += $len;
                $score = unpack('l', substr($list, $o, 4) ?: "\0\0\0\0")[1];
                $o += 4;
                $ping = unpack('V', substr($list, $o, 4) ?: "\0\0\0\0")[1];
                $o += 4;
                $players[] = ['id' => $id, 'name' => self::clean($name), 'score' => $score, 'ping' => $ping];
            }
        }

        return [
            'online' => (int) $online,
            'max' => (int) $max,
            'players' => $players,
            'hostname' => self::clean($hostname, 120) ?: null,
            'gamemode' => self::clean($gamemode) ?: null,
            'map' => self::clean($language) ?: null,
            'version' => null,
        ];
    }

    /** FiveM / RedM (FXServer). */
    private static function cfx(string $host, int $port): ?array
    {
        $base = 'http://'.(str_contains($host, ':') ? "[{$host}]" : $host).':'.$port;
        $dynamic = Http::timeout(2)->connectTimeout(2)->get($base.'/dynamic.json');
        if (! $dynamic->successful() || ! is_array($dynamic->json())) {
            return null;
        }
        $d = $dynamic->json();
        $list = Http::timeout(3)->connectTimeout(2)->get($base.'/players.json');
        $players = collect($list->successful() ? (array) $list->json() : [])
            ->filter(fn ($p) => is_array($p) && isset($p['name']))
            ->map(fn ($p) => ['id' => isset($p['id']) ? (int) $p['id'] : null, 'name' => self::clean((string) $p['name']), 'score' => null, 'ping' => isset($p['ping']) ? (int) $p['ping'] : null])
            ->take(1024)->values()->all();
        $hostname = preg_replace('/\^[0-9]/', '', (string) ($d['hostname'] ?? ''));

        return [
            'online' => (int) ($d['clients'] ?? count($players)),
            'max' => (int) ($d['sv_maxclients'] ?? 0),
            'players' => $players,
            'hostname' => self::clean((string) $hostname, 120) ?: null,
            'gamemode' => self::clean((string) ($d['gametype'] ?? '')) ?: null,
            'map' => self::clean((string) ($d['mapname'] ?? '')) ?: null,
            'version' => null,
        ];
    }

    /** Carpetas donde vive cada tipo de mod, con su etiqueta. */
    public static function modFolders(?string $kind): array
    {
        return match ($kind) {
            'mta' => [['mods/deathmatch/resources', 'Resources']],
            'samp' => [['gamemodes', 'Gamemodes'], ['filterscripts', 'Filterscripts'], ['plugins', 'Plugins'], ['components', 'Componentes']],
            'cfx' => [['resources', 'Resources'], ['server-data/resources', 'Resources']],
            'altv' => [['resources', 'Resources']],
            'ragemp' => [['packages', 'Packages (servidor)'], ['client_packages', 'Client packages']],
            'ragecoop' => [['Resources/Server', 'Resources (servidor)'], ['Resources/Client', 'Resources (cliente)']],
            'gtac' => [['resources', 'Resources']],
            default => [],
        };
    }

    /** Archivo de configuración donde se activan los mods. */
    public static function configFile(?string $kind): ?string
    {
        return match ($kind) {
            'mta' => 'mods/deathmatch/mtaserver.conf',
            'samp' => 'server.cfg',
            'cfx' => 'server.cfg',
            'altv' => 'server.toml',
            'ragemp' => 'conf.json',
            'gtac' => 'server.xml',
            default => null,
        };
    }

    /**
     * Nombres de los mods activados en la configuración (en minúsculas), o null si no se puede saber.
     * Cada juego los declara a su manera:
     *   MTA     <resource src="admin" startup="1" />
     *   SA-MP   gamemode0 x / filterscripts a b / plugins c.so
     *   open.mp config.json pawn.main_scripts / side_scripts / legacy_plugins
     *   FiveM   ensure x / start x
     *   alt:V   resources = ["a", "b"]
     *   GTAC    <resource src="x" />
     */
    public static function enabledFromConfig(?string $kind, string $config, ?string $json = null): ?array
    {
        $names = [];
        switch ($kind) {
            case 'mta':
                preg_match_all('/<resource\s[^>]*src="([^"]+)"[^>]*startup="(?:1|true)"/i', $config, $m);
                $names = $m[1];
                break;
            case 'gtac':
                preg_match_all('/<resource\s[^>]*src="([^"]+)"/i', $config, $m);
                $names = $m[1];
                break;
            case 'samp':
                foreach (preg_split('/\R/', $config) as $line) {
                    if (preg_match('/^\s*(gamemode\d+|filterscripts|plugins)\s+(.+)$/i', $line, $m)) {
                        foreach (preg_split('/\s+/', trim($m[2])) as $word) {
                            if (! preg_match('/^\d+$/', $word)) {
                                $names[] = $word;
                            }
                        }
                    }
                }
                if ($json && is_array($cfg = json_decode($json, true))) {
                    foreach (['main_scripts', 'side_scripts', 'legacy_plugins'] as $key) {
                        foreach ((array) ($cfg['pawn'][$key] ?? []) as $entry) {
                            $names[] = preg_split('/\s+/', trim((string) $entry))[0];
                        }
                    }
                }
                break;
            case 'cfx':
                preg_match_all('/^\s*(?:ensure|start)\s+([^\s#]+)/mi', $config, $m);
                $names = $m[1];
                break;
            case 'altv':
                if (preg_match('/^\s*resources\s*=\s*\[(.*?)\]/ms', $config, $m)) {
                    preg_match_all('/["\']([^"\']+)["\']/', $m[1], $q);
                    $names = $q[1];
                }
                break;
            default:
                return null;
        }

        return array_values(array_unique(array_map(
            fn ($n) => strtolower(preg_replace('/\.(so|dll|amx|pwn)$/i', '', basename(trim((string) $n, " \t\"'/")))),
            array_filter($names, fn ($n) => trim((string) $n) !== '')
        )));
    }
}
