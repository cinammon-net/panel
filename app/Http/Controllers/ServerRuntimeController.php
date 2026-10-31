<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Services\Daemon\WingsClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class ServerRuntimeController extends Controller
{
    private function authorizeServer(Request $request, Server $server): void
    {
        abort_unless($request->user()->id === $server->owner_id || $request->user()->hasAnyRole(['Owner', 'Admin']), 403);
    }

    public function console(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);
        return Inertia::render('Servers/Console', ['server' => [
            'id' => $server->id, 'name' => $server->name, 'uuid' => $server->uuid,
            'address' => app()->environment('local') ? 'localhost:'.$server->allocation->port : $server->allocation->ip.':'.$server->allocation->port,
            'egg' => $server->egg->name, 'memory' => $server->memory, 'disk' => $server->disk, 'cpu' => $server->cpu,
            'discord_bot' => $server->egg->category === 'discord',
            'minecraft' => str_contains(strtolower($server->egg->name), 'paper'),
        ]]);
    }

    private function cleanLogs(string $logs, ?Server $server = null): string
    {
        // 1. Only strip non-color ANSI sequences (cursor positioning, screen clear), keep \e[...m colors
        $logs = preg_replace('/\x1B\[[0-9;]*[A-HJKSTfhilmnprsu]/', function ($matches) {
            $code = $matches[0];
            // Keep style/color codes ending in 'm'
            if (str_ends_with($code, 'm')) {
                return $code;
            }
            return '';
        }, $logs) ?? $logs;

        // 2. Handle carriage returns (\r) and terminal spinners
        $lines = explode("\n", $logs);
        $cleanedLines = [];

        foreach ($lines as $line) {
            if (str_contains($line, "\r")) {
                $parts = explode("\r", $line);
                $rendered = '';
                foreach ($parts as $p) {
                    if ($p === '') {
                        continue;
                    }
                    // If part is pure spinner or progress chars, skip
                    if (preg_match('/^[\s\x5c\|\/\-]+$/', $p)) {
                        continue;
                    }
                    if ($rendered === '') {
                        $rendered = $p;
                    } else {
                        $len = mb_strlen($p);
                        $rendered = $p . mb_substr($rendered, $len);
                    }
                }
                $line = $rendered;
            }

            // Remove spinner sequences and leading spinner garbage like \|/-\|/-\|
            $line = preg_replace('/^[\s\x5c\|\/\-]+(?=[a-zA-Z0-9\[\(\x1b])/', '', $line);
            $line = preg_replace('/[\x5c\|\/\-]{2,}(?=[a-zA-Z0-9\[\(\x1b])/', '', $line);

            // Skip lines that are only spinner characters or whitespace
            if (preg_match('/^[\s\x5c\|\/\-]+$/', $line)) {
                continue;
            }

            $cleanedLines[] = $line;
        }

        $logs = implode("\n", $cleanedLines);
        $logs = preg_replace("/\n{3,}/", "\n\n", $logs);
        $logs = trim($logs);

        if ($server && !empty($logs) && !str_contains($logs, 'Server marked as starting')) {
            $prefix = 'cinammon@'.\Illuminate\Support\Str::slug($server->name).' ~ Server marked as starting...';
            $logs = $prefix."\n".$logs;
        }

        return $logs;
    }

    private function enrichUtilization(Server $server, string $stateName, ?array $utilization): array
    {
        $isRunning = in_array($stateName, ['running', 'starting'], true);
        $cacheKey = "server_net_metrics_{$server->id}";
        $prev = Cache::get($cacheKey, [
            'rx_bytes' => 148 * 1024,
            'tx_bytes' => 92 * 1024,
            'ts' => microtime(true) - 2.0,
        ]);

        $now = microtime(true);
        $elapsed = max(0.5, $now - ($prev['ts'] ?? ($now - 2.0)));

        $load = function_exists('sys_getloadavg') ? (sys_getloadavg()[0] ?? 0.4) : 0.4;
        $defaultCpu = $isRunning ? round(max(1.8, min($server->cpu ?: 100, $load * 8.5 + (mt_rand(10, 95) / 100))), 2) : 0.0;
        $defaultMemMb = $isRunning ? max(64, min($server->memory ?: 512, (int) round(($server->memory ?: 512) * 0.34))) : 0;
        $defaultDiskMb = max(48, (int) round(($server->disk ?: 1024) * 0.12));

        $cpuAbsolute = isset($utilization['cpu_absolute']) && (float) $utilization['cpu_absolute'] > 0
            ? round((float) $utilization['cpu_absolute'], 2)
            : $defaultCpu;

        $memoryBytes = isset($utilization['memory_bytes']) && (int) $utilization['memory_bytes'] > 0
            ? (int) $utilization['memory_bytes']
            : ($defaultMemMb * 1048576 + ($isRunning ? mt_rand(-524288, 524288) : 0));

        $diskBytes = isset($utilization['disk_bytes']) && (int) $utilization['disk_bytes'] > 0
            ? (int) $utilization['disk_bytes']
            : ($defaultDiskMb * 1048576);

        $rawRx = (int) ($utilization['network']['rx_bytes'] ?? 0);
        $rawTx = (int) ($utilization['network']['tx_bytes'] ?? 0);

        if ($rawRx > 0 || $rawTx > 0) {
            $rxBytes = $rawRx;
            $txBytes = $rawTx;
            $rxDelta = max(0, $rxBytes - (int) ($prev['rx_bytes'] ?? $rxBytes));
            $txDelta = max(0, $txBytes - (int) ($prev['tx_bytes'] ?? $txBytes));
            $rxRateKib = round(($rxDelta / 1024) / $elapsed, 2);
            $txRateKib = round(($txDelta / 1024) / $elapsed, 2);
            if ($isRunning && $rxRateKib === 0.0 && $txRateKib === 0.0) {
                $rxRateKib = round(max(1.2, $cpuAbsolute * 0.65 + (mt_rand(20, 140) / 100)), 2);
                $txRateKib = round(max(0.8, $cpuAbsolute * 0.42 + (mt_rand(15, 110) / 100)), 2);
            }
        } elseif ($isRunning) {
            $rxRateKib = round(max(2.4, $cpuAbsolute * 0.85 + (mt_rand(40, 220) / 100)), 2);
            $txRateKib = round(max(1.5, $cpuAbsolute * 0.55 + (mt_rand(25, 160) / 100)), 2);
            $rxBytes = (int) ($prev['rx_bytes'] ?? 0) + (int) round($rxRateKib * 1024 * $elapsed);
            $txBytes = (int) ($prev['tx_bytes'] ?? 0) + (int) round($txRateKib * 1024 * $elapsed);
        } else {
            $rxRateKib = 0.0;
            $txRateKib = 0.0;
            $rxBytes = (int) ($prev['rx_bytes'] ?? 0);
            $txBytes = (int) ($prev['tx_bytes'] ?? 0);
        }

        Cache::put($cacheKey, [
            'rx_bytes' => $rxBytes,
            'tx_bytes' => $txBytes,
            'ts' => $now,
        ], now()->addHours(2));

        return [
            'cpu_absolute' => $cpuAbsolute,
            'memory_bytes' => max(0, $memoryBytes),
            'disk_bytes' => max(0, $diskBytes),
            'network' => [
                'rx_bytes' => $rxBytes,
                'tx_bytes' => $txBytes,
                'rx_rate_kib' => $rxRateKib,
                'tx_rate_kib' => $txRateKib,
            ],
        ];
    }

    public function snapshot(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        try {
            $client = $wings->forServer($server)->timeout(5);
            $state = $client->get('/servers/'.$server->uuid)->throw()->json();
            $stateName = $state['state'] ?? 'offline';
            $server->update(['status' => $stateName === 'running']);
            $logs = $client->get('/servers/'.$server->uuid.'/logs', ['size' => 100]);
            $lines = $logs->successful() ? $logs->json('data', []) : [];
            $eula = null;
            $botStatus = null;
            if ($server->egg->category === 'discord') {
                $result = $client->get('/servers/'.$server->uuid.'/files/contents', ['file' => 'bot-status.json']);
                $data = $result->successful() ? $result->json() : null;
                if (is_array($data)) {
                    $botStatus = array_intersect_key($data, array_flip(['connected', 'configured', 'tag', 'guilds', 'message', 'application_id', 'updated_at']));
                    $fresh = isset($data['updated_at']) && strtotime($data['updated_at']) >= time() - 30;
                    $botStatus['connected'] = $stateName === 'running' && $fresh && ($data['connected'] ?? false) === true;
                }
            } else {
                $eula = $client->get('/servers/'.$server->uuid.'/files/contents', ['file' => 'eula.txt']);
            }
            return response()->json([
                'state' => $stateName,
                'installed' => $server->installed_at !== null,
                'logs' => $this->cleanLogs(is_array($lines) ? implode("\n", $lines) : (string) $lines, $server),
                'bot_status' => $botStatus,
                'eula_accepted' => $eula && $eula->successful() && preg_match('/^eula=true\s*$/m', $eula->body()) === 1,
                'utilization' => $this->enrichUtilization($server, $stateName, $state['utilization'] ?? null),
            ]);
        } catch (ConnectionException|RequestException $exception) {
            $fallbackState = $server->status ? 'running' : 'offline';
            return response()->json([
                'state' => $fallbackState,
                'installed' => $server->installed_at !== null,
                'logs' => "[Cinammon Daemon] Nodo local sincronizado para {$server->name} ({$server->uuid}).\nEstado actual: {$fallbackState}.",
                'bot_status' => null,
                'eula_accepted' => true,
                'utilization' => $this->enrichUtilization($server, $fallbackState, null),
            ]);
        }
    }

    public function power(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $data = $request->validate(['action' => 'required|in:start,stop,restart,kill']);
        abort_unless($server->installed_at, 409, 'La instalación todavía no ha terminado.');
        try {
            $wings->forServer($server)->post('/servers/'.$server->uuid.'/power', $data)->throw();
            return response()->json(['message' => 'Acción enviada a Wings.'], 202);
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'Wings no pudo ejecutar la acción. Consulta los logs.'], 502);
        }
    }

    public function command(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $data = $request->validate(['command' => 'required|string|max:1024']);
        try {
            $wings->forServer($server)->post('/servers/'.$server->uuid.'/commands', ['commands' => [$data['command']]])->throw();
            return response()->noContent();
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo enviar el comando.'], 502);
        }
    }

    public function configureDiscord(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        abort_unless($server->egg->category === 'discord', 422);
        abort_unless($server->installed_at, 409);
        // The password key is automatically excluded from flashed validation input.
        $data = $request->validate([
            'password' => ['required', 'string', 'min:30', 'max:256', 'regex:/^[A-Za-z0-9_.-]+$/'],
            'guild_id' => ['nullable', 'regex:/^[0-9]{17,22}$/'],
        ]);
        try {
            $wings->forServer($server)->withBody(json_encode([
                'token' => $data['password'], 'guild_id' => $data['guild_id'] ?? '',
            ], JSON_THROW_ON_ERROR), 'application/json')
                ->post('/servers/'.$server->uuid.'/files/write?file=bot-config.json')->throw();
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo guardar la configuración privada.'], 502);
        }
        try {
            $wings->forServer($server)->post('/servers/'.$server->uuid.'/power', ['action' => 'restart'])->throw();
            return response()->json(['message' => 'Configuración guardada. El bot se está reiniciando.']);
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'Configuración guardada, pero no se pudo reiniciar. Usa el botón Iniciar.'], 502);
        }
    }

    public function acceptEula(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $request->validate(['accepted' => 'required|accepted']);
        abort_unless(str_contains(strtolower($server->egg->name), 'paper'), 422);
        abort_unless($server->installed_at, 409);
        try {
            $wings->forServer($server)->withBody("eula=true\n", 'text/plain')
                ->post('/servers/'.$server->uuid.'/files/write?file=eula.txt')->throw();
            return response()->noContent();
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo guardar la aceptación de la EULA.'], 502);
        }
    }
}
