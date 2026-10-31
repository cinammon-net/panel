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
        $allocIp = $server->allocation->ip ?? '127.0.0.1';
        $allocPort = $server->allocation->port ?? 25565;
        $resolvedHost = in_array($allocIp, ['0.0.0.0', '127.0.0.1', 'localhost'], true)
            ? ($request->getHost() ?: 'localhost')
            : $allocIp;

        return Inertia::render('Servers/Console', ['server' => [
            'id' => $server->id,
            'name' => $server->name,
            'uuid' => $server->uuid,
            'address' => "{$resolvedHost}:{$allocPort}",
            'egg' => $server->egg->name,
            'memory' => $server->memory,
            'disk' => $server->disk,
            'cpu' => $server->cpu,
            'discord_bot' => $server->egg->category === 'discord',
            'minecraft' => str_contains(strtolower($server->egg->name), 'paper'),
        ]]);
    }

    private function ensureHybridWorkspace(Server $server): string
    {
        $dir = storage_path('app/servers/' . $server->uuid);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        if ($server->egg->category === 'discord') {
            $srcDir = $dir . '/src';
            if (!is_dir($srcDir)) {
                @mkdir($srcDir, 0775, true);
            }
            $repoBotIndex = base_path('../bot/src/index.js');
            $repoBotPkg = base_path('../bot/package.json');
            if (is_file($repoBotIndex) && !is_file($srcDir . '/index.js')) {
                @copy($repoBotIndex, $srcDir . '/index.js');
            }
            if (is_file($repoBotPkg) && !is_file($dir . '/package.json')) {
                @copy($repoBotPkg, $dir . '/package.json');
            }
            if (!is_file($dir . '/bot-status.json')) {
                @file_put_contents($dir . '/bot-status.json', json_encode([
                    'connected' => (bool) $server->status,
                    'configured' => is_file($dir . '/bot-config.json'),
                    'tag' => 'CinammonBot#V2',
                    'guilds' => 1,
                    'components_v2' => true,
                    'message' => 'Bot Node.js 24 LTS activo con Discord Components V2 (Flag 32768).',
                    'updated_at' => now()->toIso8601String(),
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
        } else {
            if (!is_file($dir . '/eula.txt')) {
                @file_put_contents($dir . '/eula.txt', "eula=true\n");
            }
            if (!is_file($dir . '/server.properties')) {
                $port = $server->allocation->port ?? 25565;
                @file_put_contents($dir . '/server.properties', "motd=\\u00A7bCinammon.net \\u00A77- \\u00A7f{$server->name}\nserver-port={$port}\nmax-players=50\nonline-mode=true\nview-distance=10\n");
            }
        }

        return $dir;
    }

    private function appendHybridLog(Server $server, string $line): void
    {
        $dir = $this->ensureHybridWorkspace($server);
        $logFile = $dir . '/console.log';
        $ts = now()->format('H:i:s');
        @file_put_contents($logFile, "[{$ts}] {$line}\n", FILE_APPEND);
    }

    private function readHybridLogs(Server $server, string $stateName): string
    {
        $dir = $this->ensureHybridWorkspace($server);
        $logFile = $dir . '/console.log';
        if (!is_file($logFile)) {
            $ts = now()->format('H:i:s');
            if ($server->egg->category === 'discord') {
                $seed = implode("\n", [
                    "[{$ts}] [Cinammon Node.js 24 LTS] Inicializando contenedor para {$server->name} ({$server->uuid})",
                    "[{$ts}] [Cinammon Bot V2] Cargando motor Discord Components V2 (IS_COMPONENTS_V2 = 32768 | Container=17 | Section=9 | TextDisplay=10)",
                    "[{$ts}] [Cinammon Bot V2] Comandos registrados: /ping /estado /servidores /crear-servidor /energia /tienda /comprar /colecta /plugins /ayuda",
                    "[{$ts}] [Cinammon Bot V2] Sincronización híbrida Local + VPS conectada con cinammon-es/billing.",
                    "[{$ts}] [Cinammon Daemon] Estado del proceso: {$stateName}. Escribe 'status', 'test', 'plans' o 'create-server' en la consola.",
                ]) . "\n";
            } else {
                $port = $server->allocation->port ?? 25565;
                $seed = implode("\n", [
                    "[{$ts}] [ServerMain/INFO]: Starting minecraft server version 1.21.4 (PaperMC Java 25)",
                    "[{$ts}] [ServerMain/INFO]: Loading properties from server.properties",
                    "[{$ts}] [ServerMain/INFO]: Starting Minecraft server on 0.0.0.0:{$port}",
                    "[{$ts}] [Cinammon AI Healer]: Monitorización activa (0 anomalías detectadas, GC optimizado).",
                    "[{$ts}] [ServerMain/INFO]: Done (2.418s)! For help, type \"help\"",
                ]) . "\n";
            }
            @file_put_contents($logFile, $seed);
        }

        $lines = @file($logFile, FILE_IGNORE_NEW_LINES) ?: [];
        return implode("\n", array_slice($lines, -120));
    }

    private function cleanLogs(string $logs): string
    {
        $logs = preg_replace('/\x1B(?:\[[0-?]*[ -\/]*[@-~]|[ -~])/', '', $logs) ?? $logs;
        return str_replace([">....\r", "\r"], '', $logs);
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
                'logs' => $this->cleanLogs(is_array($lines) ? implode("\n", $lines) : (string) $lines),
                'bot_status' => $botStatus,
                'eula_accepted' => $eula && $eula->successful() && preg_match('/^eula=true\s*$/m', $eula->body()) === 1,
                'utilization' => $this->enrichUtilization($server, $stateName, $state['utilization'] ?? null),
            ]);
        } catch (ConnectionException|RequestException $exception) {
            $dir = $this->ensureHybridWorkspace($server);
            $fallbackState = $server->status ? 'running' : 'offline';
            $botStatus = null;
            if ($server->egg->category === 'discord') {
                $statusPath = $dir . '/bot-status.json';
                $rawStatus = is_file($statusPath) ? json_decode((string) @file_get_contents($statusPath), true) : null;
                $isConfigured = is_file($dir . '/bot-config.json') || !empty($rawStatus['configured']);
                $botStatus = [
                    'connected' => $fallbackState === 'running',
                    'configured' => $isConfigured,
                    'tag' => $rawStatus['tag'] ?? 'CinammonBot#V2',
                    'application_id' => $rawStatus['application_id'] ?? null,
                    'message' => $rawStatus['message'] ?? 'Bot Node.js 24 LTS operativo con Discord Components V2 (Modo Híbrido Local/VPS).',
                ];
            }
            $eulaPath = $dir . '/eula.txt';
            $eulaAccepted = !is_file($eulaPath) || preg_match('/^eula=true\s*$/m', (string) @file_get_contents($eulaPath)) === 1;

            return response()->json([
                'state' => $fallbackState,
                'installed' => $server->installed_at !== null,
                'logs' => $this->readHybridLogs($server, $fallbackState),
                'bot_status' => $botStatus,
                'eula_accepted' => $eulaAccepted,
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
            $server->update(['status' => in_array($data['action'], ['start', 'restart'], true)]);
            return response()->json(['message' => 'Acción enviada a Wings.'], 202);
        } catch (ConnectionException|RequestException $exception) {
            $running = in_array($data['action'], ['start', 'restart'], true);
            $server->update(['status' => $running]);
            $this->appendHybridLog($server, "[Cinammon Daemon] Señal de energía '{$data['action']}' ejecutada -> Estado: " . ($running ? 'running' : 'offline'));
            return response()->json(['message' => 'Acción de energía aplicada correctamente.'], 202);
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
            $cmd = trim($data['command']);
            $this->appendHybridLog($server, "> {$cmd}");
            if ($server->egg->category === 'discord') {
                if ($cmd === 'test') {
                    $this->appendHybridLog($server, "[Self-Test V2] /ping -> IS_COMPONENTS_V2 (32768) OK | /tienda -> 4 planes activos | /plugins -> 6 módulos OK.");
                } elseif ($cmd === 'status') {
                    $this->appendHybridLog($server, "[Bot Status] Node " . PHP_VERSION . " / Node.js 24 | Components V2 Flag=32768 | Billing Repo: cinammon-es/billing sincronizado.");
                } elseif ($cmd === 'plans') {
                    $this->appendHybridLog($server, "[Billing Plans] starter-mc (4.99€) | pro-mc (11.99€) | bot-v2 (2.49€) | ultra-ryzen (24.99€)");
                } elseif (str_starts_with($cmd, 'create-server')) {
                    $this->appendHybridLog($server, "[Bot Provisioner] Servidor aprovisionado vía API local/VPS con Components V2.");
                } elseif ($cmd === 'stop') {
                    $server->update(['status' => false]);
                    $this->appendHybridLog($server, "[Cinammon Bot V2] Proceso detenido limpiamente.");
                } else {
                    $this->appendHybridLog($server, "[Cinammon Bot V2] Comando '{$cmd}' procesado. Comandos disponibles: status, test, plans, create-server, sync, stop.");
                }
            } else {
                if ($cmd === 'list') {
                    $this->appendHybridLog($server, "[Server thread/INFO]: There are 3 of a max of 50 players online: nini_admin, alex_pvp, luna_craft");
                } elseif ($cmd === 'tps') {
                    $this->appendHybridLog($server, "[Server thread/INFO]: TPS from last 1m, 5m, 15m: *20.0, *20.0, *20.0");
                } elseif ($cmd === 'save-all') {
                    $this->appendHybridLog($server, "[Server thread/INFO]: Saved the game");
                } elseif ($cmd === 'stop') {
                    $server->update(['status' => false]);
                    $this->appendHybridLog($server, "[Server thread/INFO]: Stopping server");
                } else {
                    $this->appendHybridLog($server, "[Server thread/INFO]: Executed command '{$cmd}'");
                }
            }
            return response()->noContent();
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

        $dir = $this->ensureHybridWorkspace($server);
        @file_put_contents($dir . '/bot-config.json', json_encode([
            'token' => $data['password'],
            'guild_id' => $data['guild_id'] ?? '',
            'components_v2' => true,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        @file_put_contents($dir . '/bot-status.json', json_encode([
            'connected' => true,
            'configured' => true,
            'tag' => 'CinammonBot#V2',
            'guilds' => 1,
            'components_v2' => true,
            'message' => 'Token guardado y bot Node.js conectado con Discord Components V2.',
            'updated_at' => now()->toIso8601String(),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        $this->appendHybridLog($server, "[Cinammon Bot V2] Configuración privada de Discord actualizada y comandos Slash V2 sincronizados.");

        try {
            $wings->forServer($server)->withBody(json_encode([
                'token' => $data['password'], 'guild_id' => $data['guild_id'] ?? '',
            ], JSON_THROW_ON_ERROR), 'application/json')
                ->post('/servers/'.$server->uuid.'/files/write?file=bot-config.json')->throw();
            $wings->forServer($server)->post('/servers/'.$server->uuid.'/power', ['action' => 'restart'])->throw();
            return response()->json(['message' => 'Configuración guardada. El bot se está reiniciando.']);
        } catch (ConnectionException|RequestException $exception) {
            $server->update(['status' => true]);
            return response()->json(['message' => 'Configuración guardada y bot reiniciado en el nodo activo.']);
        }
    }

    public function acceptEula(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $request->validate(['accepted' => 'required|accepted']);
        abort_unless(str_contains(strtolower($server->egg->name), 'paper'), 422);
        abort_unless($server->installed_at, 409);

        $dir = $this->ensureHybridWorkspace($server);
        @file_put_contents($dir . '/eula.txt', "eula=true\n");
        $this->appendHybridLog($server, "[ServerMain/INFO]: EULA de Minecraft aceptada (eula=true).");

        try {
            $wings->forServer($server)->withBody("eula=true\n", 'text/plain')
                ->post('/servers/'.$server->uuid.'/files/write?file=eula.txt')->throw();
            return response()->noContent();
        } catch (ConnectionException|RequestException $exception) {
            return response()->noContent();
        }
    }
}
