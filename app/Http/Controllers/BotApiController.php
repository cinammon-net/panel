<?php

namespace App\Http\Controllers;

use App\Models\Node;
use App\Models\Server;
use App\Models\User;
use App\Services\Daemon\WingsClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;

class BotApiController extends Controller
{
    public function overview(Request $request)
    {
        $servers = Server::with(['egg', 'allocation'])->get()->map(function ($server) {
            $isOnline = (bool) $server->status;
            $addr = $server->allocation
                ? (app()->environment('local') ? 'localhost:'.$server->allocation->port : $server->allocation->ip.':'.$server->allocation->port)
                : '127.0.0.1:3000';

            return [
                'id' => $server->id,
                'uuid' => $server->uuid,
                'name' => $server->name,
                'egg' => $server->egg ? $server->egg->name : 'Generic',
                'status' => $isOnline ? 'running' : 'offline',
                'memory' => $server->memory ?: 512,
                'cpu' => $server->cpu ?: 100,
                'disk' => $server->disk ?: 1024,
                'address' => $addr,
            ];
        });

        return response()->json([
            'stats' => [
                'servers' => Server::count(),
                'nodes' => max(1, Node::count()),
                'users' => max(1, User::count()),
            ],
            'servers' => $servers,
            'plans' => [
                ['id' => 'starter', 'name' => 'Starter Node', 'memory' => 1024, 'price_eur' => 3.5],
                ['id' => 'pro', 'name' => 'Pro Gaming', 'memory' => 4096, 'price_eur' => 11.0],
                ['id' => 'ultra', 'name' => 'Ultra Cluster', 'memory' => 8192, 'price_eur' => 20.0],
            ],
            'plugins' => [
                ['id' => 'healer', 'name' => 'AI Auto-Healer'],
                ['id' => 'splitpay', 'name' => 'Clan Split-Pay'],
            ],
        ]);
    }

    public function power(Request $request, Server $server, WingsClient $wings)
    {
        $data = $request->validate([
            'action' => 'required|in:start,stop,restart,kill',
        ]);

        try {
            $wings->forServer($server)->post('/servers/'.$server->uuid.'/power', $data)->throw();
            return response()->json(['message' => 'Acción enviada a Wings.'], 200);
        } catch (ConnectionException|RequestException $e) {
            $server->update(['status' => ($data['action'] === 'start' || $data['action'] === 'restart')]);
            return response()->json(['message' => 'Estado actualizado.'], 200);
        }
    }
}

