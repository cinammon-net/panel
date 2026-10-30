<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Services\Daemon\WingsClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
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
            'egg' => $server->egg->name, 'memory' => $server->memory,
            'discord_bot' => $server->egg->category === 'discord',
            'minecraft' => str_contains(strtolower($server->egg->name), 'paper'),
        ]]);
    }

    private function cleanLogs(string $logs): string
    {
        $logs = preg_replace('/\x1B(?:\[[0-?]*[ -\/]*[@-~]|[ -~])/', '', $logs) ?? $logs;
        return str_replace([">....\r", "\r"], '', $logs);
    }

    public function snapshot(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        try {
            $client = $wings->forServer($server)->timeout(5);
            $state = $client->get('/servers/'.$server->uuid)->throw()->json();
            $server->update(['status' => ($state['state'] ?? '') === 'running']);
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
                    $botStatus['connected'] = ($state['state'] ?? '') === 'running' && $fresh && ($data['connected'] ?? false) === true;
                }
            } else {
                $eula = $client->get('/servers/'.$server->uuid.'/files/contents', ['file' => 'eula.txt']);
            }
            return response()->json([
                'state' => $state['state'] ?? 'offline',
                'installed' => $server->installed_at !== null,
                'logs' => $this->cleanLogs(is_array($lines) ? implode("\n", $lines) : (string) $lines),
                'bot_status' => $botStatus,
                'eula_accepted' => $eula && $eula->successful() && preg_match('/^eula=true\s*$/m', $eula->body()) === 1,
                'utilization' => $state['utilization'] ?? null,
            ]);
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se puede conectar con Wings. Comprueba el nodo.'], 502);
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
