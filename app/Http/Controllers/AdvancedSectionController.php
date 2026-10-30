<?php

namespace App\Http\Controllers;

use App\Models\Egg;
use App\Models\Node;
use App\Models\Server;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdvancedSectionController extends Controller
{
    public function health()
    {
        $dbConnected = false;
        $dbDriver = config('database.default');
        $dbLatencyMs = 0;

        $start = microtime(true);
        try {
            DB::connection()->getPdo();
            $dbConnected = true;
            $dbLatencyMs = round((microtime(true) - $start) * 1000, 2);
        } catch (\Throwable $e) {
            $dbConnected = false;
        }

        $cacheWorking = false;
        try {
            Cache::put('health_check_ping', 'ok', 10);
            $cacheWorking = Cache::get('health_check_ping') === 'ok';
        } catch (\Throwable $e) {
            $cacheWorking = false;
        }

        $nodes = Node::withCount('servers')->get()->map(function (Node $node) {
            $scheme = $node->scheme ?: 'http';
            $port = $node->daemonListen ?: 8080;
            $url = "{$scheme}://{$node->fqdn}:{$port}/api/system";
            $online = false;
            $latencyMs = null;
            $wingsVersion = 'N/A';

            $start = microtime(true);
            try {
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $node->daemon_token,
                    'Accept' => 'application/json',
                ])->timeout(2)->get($url);

                if ($response->successful() || $response->status() === 401 || $response->status() === 403) {
                    $online = true;
                    $latencyMs = round((microtime(true) - $start) * 1000, 1);
                    $wingsVersion = $response->json('version') ?? '1.11.x (Active)';
                }
            } catch (\Throwable $e) {
                $online = false;
            }

            return [
                'id' => $node->id,
                'name' => $node->name,
                'fqdn' => $node->fqdn,
                'port' => $port,
                'scheme' => $scheme,
                'memory' => $node->memory,
                'disk' => $node->disk,
                'servers_count' => $node->servers_count,
                'online' => $online,
                'latency_ms' => $latencyMs,
                'wings_version' => $wingsVersion,
                'maintenance_mode' => (bool) $node->maintenance_mode,
            ];
        });

        return Inertia::render('Health', [
            'system' => [
                'panel_version' => config('app.version', '1.0.0'),
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'environment' => config('app.env'),
                'db_connected' => $dbConnected,
                'db_driver' => $dbDriver,
                'db_latency_ms' => $dbLatencyMs,
                'cache_working' => $cacheWorking,
                'queue_driver' => config('queue.default'),
                'counts' => [
                    'users' => User::count(),
                    'servers' => Server::count(),
                    'nodes' => Node::count(),
                    'eggs' => Egg::count(),
                ],
            ],
            'nodes' => $nodes,
        ]);
    }

    public function apiKeys()
    {
        $keys = DB::table('api_keys')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($key) => [
                'id' => $key->id,
                'public' => $key->public,
                'secret_preview' => substr($key->secret, 0, 8) . '...' . substr($key->secret, -4),
                'secret' => $key->secret,
                'allowed_ips' => $key->allowed_ips,
                'created_at' => $key->created_at,
            ]);

        return Inertia::render('ApiKeys', [
            'apiKeys' => $keys,
        ]);
    }

    public function storeApiKey(Request $request)
    {
        $validated = $request->validate([
            'allowed_ips' => 'nullable|string|max:500',
        ]);

        $public = 'cnm_' . Str::random(12);
        $secret = 'cnm_secret_' . Str::random(36);

        DB::table('api_keys')->insert([
            'public' => $public,
            'secret' => $secret,
            'allowed_ips' => $validated['allowed_ips'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect()->route('api-keys.index')->with('success', 'API Key creada correctamente.');
    }

    public function destroyApiKey(int $id)
    {
        DB::table('api_keys')->where('id', $id)->delete();

        return redirect()->route('api-keys.index')->with('success', 'API Key eliminada correctamente.');
    }

    public function database()
    {
        $hosts = Cache::get('cinammon_database_hosts', [
            [
                'id' => 1,
                'name' => 'Local Database Host',
                'host' => '127.0.0.1',
                'port' => 3306,
                'username' => 'cinammon',
                'max_databases' => 50,
                'node_id' => Node::first()?->id,
                'node_name' => Node::first()?->name ?? 'Local Node',
                'status' => 'online',
            ],
        ]);

        $serversWithDb = Server::with('node:id,name')
            ->select('id', 'name', 'uuid', 'node_id', 'database_limit')
            ->get()
            ->map(function ($s) {
                $defaultDbs = [
                    [
                        'id' => 1,
                        'name' => 's' . $s->id . '_cinammon',
                        'user' => 'u' . $s->id . '_admin',
                        'host' => '127.0.0.1',
                        'port' => 3306,
                    ],
                ];
                $dbs = Cache::get("server_databases_{$s->id}", $defaultDbs);

                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'uuid' => $s->uuid,
                    'node_name' => $s->node?->name ?? 'N/A',
                    'database_limit' => max((int) ($s->database_limit ?? 0), count($dbs)),
                    'databases' => array_values($dbs),
                ];
            });

        return Inertia::render('Database', [
            'hosts' => array_values($hosts),
            'servers' => $serversWithDb,
            'nodes' => Node::select('id', 'name')->get(),
        ]);
    }

    public function storeDatabaseHost(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'host' => 'required|string|max:191',
            'port' => 'required|integer|min:1|max:65535',
            'username' => 'required|string|max:191',
            'max_databases' => 'nullable|integer|min:0',
            'node_id' => 'nullable|integer',
        ]);

        $hosts = Cache::get('cinammon_database_hosts', []);
        $node = isset($validated['node_id']) ? Node::find($validated['node_id']) : null;
        $nextId = collect($hosts)->max('id') + 1;

        $hosts[] = [
            'id' => $nextId ?: 1,
            'name' => $validated['name'],
            'host' => $validated['host'],
            'port' => (int) $validated['port'],
            'username' => $validated['username'],
            'max_databases' => (int) ($validated['max_databases'] ?? 50),
            'node_id' => $node?->id,
            'node_name' => $node?->name ?? 'Global',
            'status' => 'online',
        ];

        Cache::forever('cinammon_database_hosts', array_values($hosts));

        return redirect()->route('database.index')->with('success', 'Database Host registrado correctamente.');
    }

    public function destroyDatabaseHost(int $id)
    {
        $hosts = collect(Cache::get('cinammon_database_hosts', []))
            ->reject(fn ($h) => (int) $h['id'] === $id)
            ->values()
            ->all();

        Cache::forever('cinammon_database_hosts', $hosts);

        return redirect()->route('database.index')->with('success', 'Database Host eliminado.');
    }

    public function mounts()
    {
        $mounts = DB::table('mounts')->orderByDesc('id')->get()->map(function ($mount) {
            $eggIds = DB::table('egg_mount')->where('mount_id', $mount->id)->pluck('egg_id')->all();
            $nodeIds = DB::table('mount_node')->where('mount_id', $mount->id)->pluck('node_id')->all();

            return [
                'id' => $mount->id,
                'uuid' => $mount->uuid,
                'name' => $mount->name,
                'description' => $mount->description,
                'source' => $mount->source,
                'target' => $mount->target,
                'read_only' => (bool) $mount->read_only,
                'user_mountable' => (bool) $mount->user_mountable,
                'eggs_count' => count($eggIds),
                'nodes_count' => count($nodeIds),
            ];
        });

        return Inertia::render('Mounts', [
            'mounts' => $mounts,
            'eggs' => Egg::select('id', 'name')->get(),
            'nodes' => Node::select('id', 'name')->get(),
        ]);
    }

    public function storeMount(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:191|unique:mounts,name',
            'description' => 'nullable|string',
            'source' => 'required|string|max:255',
            'target' => 'required|string|max:255',
            'read_only' => 'boolean',
            'user_mountable' => 'boolean',
        ]);

        DB::table('mounts')->insert([
            'uuid' => (string) Str::uuid(),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'source' => $validated['source'],
            'target' => $validated['target'],
            'read_only' => !empty($validated['read_only']) ? 1 : 0,
            'user_mountable' => !empty($validated['user_mountable']) ? 1 : 0,
        ]);

        return redirect()->route('mounts.index')->with('success', 'Mount creado correctamente.');
    }

    public function destroyMount(int $id)
    {
        DB::table('egg_mount')->where('mount_id', $id)->delete();
        DB::table('mount_node')->where('mount_id', $id)->delete();
        DB::table('mounts')->where('id', $id)->delete();

        return redirect()->route('mounts.index')->with('success', 'Mount eliminado correctamente.');
    }

    public function webhooks()
    {
        $webhooks = Cache::get('cinammon_webhooks', [
            [
                'id' => 1,
                'name' => 'Discord Server Alerts',
                'url' => 'https://discord.com/api/webhooks/example',
                'events' => ['server.created', 'server.power', 'node.heartbeat'],
                'enabled' => true,
                'created_at' => now()->toDateTimeString(),
            ],
        ]);

        return Inertia::render('Webhooks', [
            'webhooks' => array_values($webhooks),
        ]);
    }

    public function storeWebhook(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'url' => 'required|url|max:500',
            'events' => 'nullable|array',
            'enabled' => 'boolean',
        ]);

        $webhooks = Cache::get('cinammon_webhooks', []);
        $nextId = collect($webhooks)->max('id') + 1;

        $webhooks[] = [
            'id' => $nextId ?: 1,
            'name' => $validated['name'],
            'url' => $validated['url'],
            'events' => $validated['events'] ?? ['server.created', 'server.deleted'],
            'enabled' => $validated['enabled'] ?? true,
            'created_at' => now()->toDateTimeString(),
        ];

        Cache::forever('cinammon_webhooks', array_values($webhooks));

        return redirect()->route('webhooks.index')->with('success', 'Webhook guardado correctamente.');
    }

    public function destroyWebhook(int $id)
    {
        $webhooks = collect(Cache::get('cinammon_webhooks', []))
            ->reject(fn ($w) => (int) $w['id'] === $id)
            ->values()
            ->all();

        Cache::forever('cinammon_webhooks', $webhooks);

        return redirect()->route('webhooks.index')->with('success', 'Webhook eliminado.');
    }
}

