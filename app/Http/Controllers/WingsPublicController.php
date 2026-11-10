<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Support\WingsEvents;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Datos del monitor público de Wings (wings.cinammon.net). Mantiene la estructura de siempre
 * (wings, docker, system, logs) pero cada campo depende del rol de quien consulta:
 *
 *  público  → estado y tiempo activo
 *  own      → + sus contenedores y los eventos de sus servidores
 *  ops      → + puertos, memoria del anfitrión y eventos operativos de todos los servidores
 *  full     → + PID, memoria y CPU de Wings y todos los eventos con su detalle depurado (rol Admin)
 *  owner    → lo mismo, pero sin depurar: IPs, usuarios y líneas originales del registro (rol Owner)
 *
 * Los campos que el rol no puede ver se devuelven a null (la página los muestra con un candado).
 */
class WingsPublicController extends Controller
{
    private const SNAPSHOT = '/run/cinammon-telemetry/wings.json';

    public function telemetry(Request $request): JsonResponse
    {
        $user = $request->user();
        $tier = $user ? WingsEvents::tier($user) : 'public';
        $staff = in_array($tier, [WingsEvents::OWNER, WingsEvents::FULL, WingsEvents::OPS], true);
        $full = in_array($tier, [WingsEvents::OWNER, WingsEvents::FULL], true);

        $t = @json_decode((string) @file_get_contents(self::SNAPSHOT), true);
        $t = is_array($t) && time() - (int) ($t['generated_at'] ?? 0) < 90 ? $t : null;

        $w = $t['wings'] ?? [];
        $started = $w['started_at'] ?? null;
        $age = $started ? max(0, time() - (int) $started) : null;
        $containers = $t['containers'] ?? [];

        $count = count($containers);
        if ($tier === 'public') {
            $count = null;
        } elseif ($tier === WingsEvents::OWN) {
            $mine = Server::where('owner_id', $user->id)
                ->orWhereHas('subusers', fn ($q) => $q->where('user_id', $user->id))->pluck('uuid')->all();
            $count = count(array_filter($containers, fn ($c) => in_array($c['name'], $mine, true)));
        }

        $lines = min(300, max(20, (int) $request->query('lines', 100)));
        $events = $user ? WingsEvents::present($user, null, $lines)['events'] : [];
        $logs = array_map(function ($e) {
            $line = sprintf('%s: [%s] %s%s', $e['level'], gmdate('H:i:s', strtotime($e['ts'])), $e['server'] ? "[{$e['server']}] " : '', $e['message']);
            $line .= ($e['count'] ?? 1) > 1 ? " ×{$e['count']}" : '';
            if (! empty($e['detail']) && $e['detail'] !== $e['message']) {
                $line .= ' — '.$e['detail'];
            }

            return $line;
        }, $events);

        return response()->json([
            'success' => true,
            'timestamp' => gmdate('Y-m-d H:i:s').' UTC',
            'wings' => [
                'status' => $t ? ($w['service'] ?? 'unknown') : 'unknown',
                'uptime' => $age === null ? null : sprintf('%dh %dm %ds', intdiv($age, 3600), intdiv($age % 3600, 60), $age % 60),
                'started_at' => $started ? gmdate('Y-m-d H:i:s', (int) $started).' UTC' : null,
                'pid' => $full ? ($w['pid'] ?? null) : null,
                'memory_mb' => $full ? ($w['memory_mb'] ?? null) : null,
                'cpu_seconds' => $full ? ($w['cpu_seconds'] ?? null) : null,
                'sftp_listening' => $staff && $t ? ($t['ports']['sftp'] ?? 'closed') !== 'closed' : null,
                'api_listening' => $staff && $t ? ($t['ports']['wings_api'] ?? 'closed') !== 'closed' : null,
            ],
            'docker' => ['count' => $count],
            'system' => $staff && $t ? [
                'host_ram_used_mb' => $t['host']['memory_used_mb'] ?? null,
                'host_ram_total_mb' => $t['host']['memory_total_mb'] ?? null,
                'load_average' => $t['host']['load'] ?? null,
            ] : null,
            'logs' => $logs,
            'access' => [
                'tier' => $tier,
                'user' => $user?->name,
                'csrf' => csrf_token(),
                'log_notice' => $user
                    ? 'Sin eventos recientes para tu rol.'
                    : 'Inicia sesión para ver la consola de Wings. Cada rol ve solo lo que le corresponde.',
            ],
        ])->header('Cache-Control', 'no-store');
    }
}
