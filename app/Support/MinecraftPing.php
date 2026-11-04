<?php

namespace App\Support;

use App\Models\Server;
use Illuminate\Support\Facades\Cache;

/**
 * Server List Ping de Minecraft Java (lo mismo que hace el juego en la lista de servidores):
 * jugadores conectados, máximo, muestra de nombres, MOTD y versión.
 */
class MinecraftPing
{
    /** @return array{online:int,max:int,players:array<int,array{name:string,id:string}>,version:?string,motd:?string}|null */
    public static function forServer(Server $server, int $cacheSeconds = 5): ?array
    {
        $allocation = $server->allocation;
        if (! $allocation || ! MinecraftAddons::hasPlayerLists($server)) {
            return null;
        }
        $host = in_array((string) $allocation->ip, ['', '0.0.0.0', '::'], true) ? '127.0.0.1' : (string) $allocation->ip;

        return Cache::remember('mc_ping:'.$server->id, now()->addSeconds($cacheSeconds), fn () => self::status($host, (int) $allocation->port) ?? false) ?: null;
    }

    public static function status(string $host, int $port, float $timeout = 2.0): ?array
    {
        $socket = @stream_socket_client('tcp://'.(str_contains($host, ':') ? "[{$host}]" : $host).':'.$port, $errno, $errstr, $timeout);
        if (! $socket) {
            return null;
        }
        stream_set_timeout($socket, (int) ceil($timeout));
        try {
            $handshake = self::varint(0x00).self::varint(-1 & 0xFFFFFFFF).self::string($host).pack('n', $port).self::varint(1);
            fwrite($socket, self::varint(strlen($handshake)).$handshake);
            fwrite($socket, self::varint(1).self::varint(0x00));

            $length = self::readVarint($socket);
            if ($length === null || $length <= 0 || $length > 1048576) {
                return null;
            }
            $packet = '';
            while (strlen($packet) < $length && ! feof($socket)) {
                $chunk = fread($socket, $length - strlen($packet));
                if ($chunk === false || $chunk === '') {
                    break;
                }
                $packet .= $chunk;
            }
            $offset = 0;
            if (self::varintFrom($packet, $offset) !== 0x00) {
                return null;
            }
            $jsonLength = self::varintFrom($packet, $offset);
            $data = json_decode(substr($packet, $offset, (int) $jsonLength), true);
            if (! is_array($data)) {
                return null;
            }

            return [
                'online' => (int) ($data['players']['online'] ?? 0),
                'max' => (int) ($data['players']['max'] ?? 0),
                'players' => collect($data['players']['sample'] ?? [])
                    ->filter(fn ($p) => is_array($p) && preg_match('/^[A-Za-z0-9_]{3,16}$/', (string) ($p['name'] ?? '')))
                    ->map(fn ($p) => ['name' => (string) $p['name'], 'id' => (string) ($p['id'] ?? '')])
                    ->values()->all(),
                'version' => isset($data['version']['name']) ? mb_substr((string) $data['version']['name'], 0, 60) : null,
                'motd' => self::motdText($data['description'] ?? null),
            ];
        } finally {
            fclose($socket);
        }
    }

    private static function motdText($description): ?string
    {
        if (is_string($description)) {
            return mb_substr($description, 0, 200);
        }
        if (! is_array($description)) {
            return null;
        }
        $text = (string) ($description['text'] ?? '');
        foreach ($description['extra'] ?? [] as $part) {
            $text .= is_array($part) ? (string) ($part['text'] ?? '') : (string) $part;
        }

        return mb_substr($text, 0, 200);
    }

    private static function varint(int $value): string
    {
        $value &= 0xFFFFFFFF;
        $out = '';
        do {
            $byte = $value & 0x7F;
            $value >>= 7;
            $out .= chr($value ? $byte | 0x80 : $byte);
        } while ($value);

        return $out;
    }

    private static function string(string $s): string
    {
        return self::varint(strlen($s)).$s;
    }

    private static function readVarint($socket): ?int
    {
        $value = 0;
        for ($i = 0; $i < 5; $i++) {
            $c = fread($socket, 1);
            if ($c === false || $c === '') {
                return null;
            }
            $byte = ord($c);
            $value |= ($byte & 0x7F) << (7 * $i);
            if (! ($byte & 0x80)) {
                return $value;
            }
        }

        return null;
    }

    private static function varintFrom(string $buffer, int &$offset): ?int
    {
        $value = 0;
        for ($i = 0; $i < 5 && $offset < strlen($buffer); $i++) {
            $byte = ord($buffer[$offset++]);
            $value |= ($byte & 0x7F) << (7 * $i);
            if (! ($byte & 0x80)) {
                return $value;
            }
        }

        return null;
    }
}
