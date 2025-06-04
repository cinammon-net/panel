<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Node;
use Illuminate\Support\Facades\Http;

class CheckNodesStatus extends Command
{
    protected $signature = 'nodes:check-status';
    protected $description = 'Revisa el estado de los nodos y actualiza su estado online';

    public function handle()
    {
        $nodes = Node::all();

        foreach ($nodes as $node) {
            try {
                // Suponiendo que Wings expone un endpoint para checar salud, ej:
                $response = Http::timeout(5)->get("https://{$node->fqdn}/health");

                if ($response->successful() && $response->json('status') === 'healthy') {
                    $node->online = true;
                } else {
                    $node->online = false;
                }
            } catch (\Exception $e) {
                // Si falla la conexión, asumimos que no está online
                $node->online = false;
            }

            $node->save();
        }

        $this->info('Estados de nodos actualizados correctamente.');
    }
}
