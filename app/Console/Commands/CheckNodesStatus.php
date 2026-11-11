<?php

namespace App\Console\Commands;

use App\Models\Node;
use App\Models\Server;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class CheckNodesStatus extends Command
{
    protected $signature = 'nodes:check-status';
    protected $description = 'Revisa el estado de los nodos y corrige el estado (encendido/apagado) de sus servidores';

    public function handle()
    {
        foreach (Node::all() as $node) {
            $scheme = $node->scheme === 'http' ? 'http' : 'https';
            $base = "{$scheme}://{$node->fqdn}:{$node->daemon_listen}/api";
            $http = fn () => Http::withToken($node->daemon_token ?? '')->acceptJson()->timeout(5);

            try {
                $response = $http()->get("{$base}/system");
                $node->online = $response->successful() && is_string($response->json('version'));
            } catch (\Exception $e) {
                $node->online = false;
            }
            $node->save();

            if ($node->online) {
                $this->syncServerStates($node, fn () => $http()->get("{$base}/servers"));
            }
        }

        $this->info('Estados de nodos actualizados.');
    }

    /**
     * La lista de servidores usa la columna `status`, que Wings actualiza con avisos de
     * arrancado/parado. Si se pierde alguno (un reinicio fuera de Wings, un corte), se quedaba
     * mal hasta que alguien abría la consola. Aquí se compara con lo que dice Wings y se corrige.
     */
    private function syncServerStates(Node $node, callable $fetch): void
    {
        try {
            $response = $fetch();
            if (! $response->successful() || ! is_array($response->json())) {
                return;
            }
        } catch (\Exception $e) {
            return;
        }

        $running = [];
        foreach ($response->json() as $s) {
            $uuid = $s['configuration']['uuid'] ?? $s['uuid'] ?? null;
            if (is_string($uuid)) {
                $running[$uuid] = ($s['state'] ?? 'offline') === 'running';
            }
        }

        foreach (Server::where('node_id', $node->id)->get(['id', 'uuid', 'status']) as $server) {
            if (! array_key_exists($server->uuid, $running)) {
                continue; // Wings no lo conoce (instalándose o borrado): no se toca
            }
            if ((bool) $server->status !== $running[$server->uuid]) {
                $server->forceFill(['status' => $running[$server->uuid]])->save();
            }
        }
    }
}
