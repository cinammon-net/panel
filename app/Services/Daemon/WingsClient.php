<?php

namespace App\Services\Daemon;

use App\Models\Server;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class WingsClient
{
    public function forServer(Server $server): PendingRequest
    {
        $node = $server->node;
        $scheme = $node->scheme === 'http' ? 'http' : 'https';
        return Http::baseUrl("{$scheme}://{$node->fqdn}:{$node->daemon_listen}/api")
            ->withToken($node->daemon_token)->acceptJson()->connectTimeout(5)->timeout(30);
    }

    public function provision(Server $server): void
    {
        $this->forServer($server)->post('/servers', [
            'uuid' => $server->uuid, 'start_on_completion' => (bool) $server->start_after_install,
        ])->throw();
    }
}
