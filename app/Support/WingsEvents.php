<?php

namespace App\Support;

use App\Models\Server;
use App\Models\User;

/**
 * Eventos de Wings visibles según el rol. La fuente ya viene depurada (sin IPs, correos, rutas ni secretos);
 * aquí solo se decide qué eventos ve cada persona y con qué nivel de detalle.
 *
 *  - owner: rol Owner → todo sin depurar (IPs, usuarios y líneas originales del registro).
 *  - full: Admin → todo, con detalle técnico ya depurado.
 *  - ops:  Moderator y Helper → eventos operativos de todos los servidores, sin detalle técnico.
 *  - own:  resto de roles y clientes → solo eventos de los servidores que poseen o en los que son subusuarios.
 */
class WingsEvents
{
    public const OWNER = 'owner';
    public const FULL = 'full';
    public const OPS = 'ops';
    public const OWN = 'own';

    private const SNAPSHOT = '/run/cinammon-telemetry/wings-log.json';
    private const SNAPSHOT_RAW = '/run/cinammon-telemetry/wings-log-raw.json';
    private const MAX_AGE = 90;

    private const OPERATIONAL = [
        'power', 'power_done', 'power_error', 'crash', 'crash_norestart', 'crash_error',
        'install_start', 'install_run', 'install_done', 'reinstall', 'boot_ready', 'sftp_failed',
    ];

    public static function tier(User $user): string
    {
        if ($user->hasRole('Owner')) {
            return self::OWNER;
        }

        if ($user->hasRole('Admin')) {
            return self::FULL;
        }

        return $user->hasAnyRole(['Moderator', 'Helper']) ? self::OPS : self::OWN;
    }

    private static function source(bool $raw = false): ?array
    {
        if (config('panel.demo')) {
            return DemoWings::events($raw);
        }

        $data = @json_decode((string) @file_get_contents($raw ? self::SNAPSHOT_RAW : self::SNAPSHOT), true);

        return is_array($data) && time() - (int) ($data['generated_at'] ?? 0) < self::MAX_AGE ? $data : null;
    }

    /** @return array{tier: string, stale: bool, generated_at: int|null, events: array<int, array<string, mixed>>} */
    public static function present(User $user, ?Server $only = null, int $limit = 250): array
    {
        $tier = self::tier($user);
        $source = self::source($tier === self::OWNER);

        if (! $source) {
            return ['tier' => $tier, 'stale' => true, 'generated_at' => null, 'events' => []];
        }

        $servers = Server::get(['id', 'uuid', 'uuid_short', 'name', 'owner_id']);
        $byUuid = $servers->keyBy('uuid');
        $byShort = $servers->keyBy('uuid_short');
        $mine = $servers->filter(fn ($s) => $s->owner_id === $user->id)->pluck('uuid')
            ->merge(Server::whereHas('subusers', fn ($q) => $q->where('user_id', $user->id))->pluck('uuid'))
            ->flip();

        $events = [];
        foreach ($source['events'] as $e) {
            $server = $byUuid[$e['server'] ?? ''] ?? ($e['server_short'] ?? null ? $byShort[$e['server_short']] ?? null : null);

            if ($only && $server?->id !== $only->id) {
                continue;
            }
            if ($tier === self::OWN && (! $server || ! isset($mine[$server->uuid]))) {
                continue;
            }
            if (! in_array($tier, [self::FULL, self::OWNER], true) && ! in_array($e['kind'], self::OPERATIONAL, true)) {
                continue;
            }

            $item = [
                'id' => $e['id'],
                'ts' => $e['ts'],
                'level' => $e['level'],
                'kind' => $e['kind'],
                // El propietario ve la línea original del registro; el resto, el texto resumido.
                'message' => $tier === self::OWNER && ! empty($e['raw']) ? $e['raw'] : self::friendly($e),
                'server' => $server?->name,
                'count' => $e['count'] ?? 1,
            ];
            if (in_array($tier, [self::FULL, self::OWNER], true)) {
                // El propietario ve el texto original del registro, con IPs y usuarios; el resto, la versión depurada.
                $item['detail'] = $tier === self::OWNER && ! empty($e['raw']) ? null : ($e['detail'] ?? null);
                $item['user'] = $e['user'] ?? null;
                if ($tier === self::OWNER) {
                    $item['ip'] = $e['ip'] ?? null;
                }
            }
            $events[] = $item;
        }

        return ['tier' => $tier, 'stale' => false, 'generated_at' => $source['generated_at'], 'events' => array_slice($events, -$limit)];
    }

    private static function friendly(array $e): string
    {
        $action = ['start' => 'encender', 'stop' => 'apagar', 'restart' => 'reiniciar', 'kill' => 'forzar el apagado'][$e['action'] ?? ''] ?? ($e['action'] ?? 'desconocida');

        return match ($e['kind']) {
            'power' => "Acción de energía en curso: {$action}",
            'power_done' => "Acción de energía completada: {$action}",
            'power_error' => "No se pudo completar la acción: {$action}",
            'crash' => 'El servidor se detuvo de forma inesperada',
            'crash_norestart' => 'No se reinició solo: el fallo ocurrió demasiado pronto tras el anterior',
            'crash_error' => 'Error al gestionar el fallo del servidor',
            'install_start' => 'Instalación iniciada',
            'install_run' => 'Ejecutando el script de instalación',
            'install_done' => 'Instalación completada',
            'reinstall' => 'Reinstalación solicitada',
            'boot_ready' => 'Preparando el servidor para arrancar',
            'boot' => 'Actualización interna del servidor',
            'sftp_failed' => 'Intento de acceso SFTP fallido (origen oculto)',
            default => (string) ($e['detail'] ?? ''),
        };
    }
}
