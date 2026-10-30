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
                $scheme = $node->scheme === 'http' ? 'http' : 'https';
                $response = Http::withToken($node->daemon_token ?? '')
                    ->timeout(5)->get("{$scheme}://{$node->fqdn}:{$node->daemon_listen}/api/system");

                if ($response->successful() && is_string($response->json('version'))) {
                    $node->online = true;  
                } else {
                    $node->online = false; 
                }
            } catch (\Exception $e) {
                $node->online = false;
            }
            $node->save();
        }

        $this->info('Estados de nodos actualizados.');
    }
}
