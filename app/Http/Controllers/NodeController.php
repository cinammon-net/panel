<?php

namespace App\Http\Controllers;

use App\Models\Node;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Yaml\Yaml;

class NodeController extends Controller
{
    public function index(Request $request)
    {
        $query = Node::withCount('servers');

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $sortable = ['name', 'fqdn', 'scheme', 'maintenance_mode'];
        $sort = in_array($request->get('sort'), $sortable) ? $request->get('sort') : 'name';
        $direction = $request->get('direction') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sort, $direction);

        $perPage = $request->integer('per_page', 25);
        $paginated = $query->paginate($perPage)->withQueryString();

        $nodes = $paginated->getCollection()->map(function ($node) {
            return [
                'id' => $node->id,
                'name' => $node->name,
                'fqdn' => $node->fqdn,
                'scheme' => $node->scheme,
                'online' => (bool) $node->online,
                'public' => (bool) ($node->public ?? true),
                'servers' => $node->servers_count ?? 0,
                'status' => $node->maintenance_mode ? 'warning' : ($node->online ? 'online' : 'offline'),
                'ssl' => $node->scheme === 'https',
                'maintenance' => (bool) $node->maintenance_mode,
                'health' => $node->maintenance_mode ? '⚠️' : ($node->online ? '✅' : '❌'),
            ];
        });

        $paginated->setCollection($nodes);

        return Inertia::render('Nodes', [
            'nodes' => $paginated,
            'filters' => $request->only(['search', 'sort', 'direction', 'per_page']),
        ]);
    }

    public function show($id)
    {
        $node = Node::find($id);

        if (!$node) {
            return redirect()->route('nodes.index')->with('error', 'Nodo no encontrado.');
        }

        $resolvedIp = gethostbyname($node->fqdn);
        if ($resolvedIp === $node->fqdn) {
            $resolvedIp = null;
        }

        return Inertia::render('NodeShow', [
            'node' => $node,
            'resolvedIp' => $resolvedIp,
        ]);
    }

    public function create()
    {
        return Inertia::render('Nodes/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'fqdn' => 'required|string|max:255',
            'daemon_listen' => 'required|integer|min:1|max:65535',
            'ssl_mode' => 'required|in:http,https,https-reverse',
            'maintenance_mode' => 'required|boolean',
            'deployments' => 'required|boolean',
            'upload_size' => 'nullable|integer|min:1|max:2048000',
            'sftp_port' => 'required|integer|min:1|max:65535',
            'sftp_alias' => 'nullable|string',
            'tags' => 'nullable|string',
            'memory' => 'nullable|regex:/^(unlimited|[0-9]+)$/',
            'disk' => 'nullable|regex:/^(unlimited|[0-9]+)$/',
            'cpu' => 'nullable|regex:/^(unlimited|[0-9]+)$/',
            'uuid' => 'uuid|unique:nodes,uuid',
            'daemon_sftp' => 'nullable|integer',
            'daemon_sftp_alias' => 'nullable|string',
        ]);

        // Generar tokens si no vienen en la petición
        $validated['daemon_token_id'] = Str::uuid();
        $validated['daemon_token'] = Str::random(64);

        $validated['scheme'] = $validated['ssl_mode'];
        unset($validated['ssl_mode']);

        $validated['maintenance_mode'] = (bool) $validated['maintenance_mode'];
        $validated['deployments'] = (bool) $validated['deployments'];
        $validated['sftp_alias'] = $validated['sftp_alias'] ?? '';
        $validated['tags'] = $validated['tags'] ?? '';
        $validated['memory'] = ($validated['memory'] ?? null) === 'unlimited' ? null : ($validated['memory'] ?? null);
        $validated['disk'] = ($validated['disk'] ?? null) === 'unlimited' ? null : ($validated['disk'] ?? null);
        $validated['cpu'] = ($validated['cpu'] ?? null) === 'unlimited' ? null : ($validated['cpu'] ?? null);
        $validated['daemon_sftp'] = $validated['sftp_port'];
        unset($validated['sftp_port']);
        $validated['daemon_sftp_alias'] = $validated['sftp_alias'];
        unset($validated['sftp_alias']);
        $validated['uuid'] = (string) Str::uuid();

        Node::create($validated);

        return redirect()->route('nodes.index')->with('success', 'Nodo creado correctamente.');
    }

    public function edit($id)
    {
        $node = Node::with(['servers.owner', 'servers.egg', 'servers.allocation'])->find($id);

        if (!$node) {
            return redirect()->route('nodes.index')->with('error', 'Nodo no encontrado.');
        }
        try {
            $scheme = $node->scheme === 'http' ? 'http' : 'https';
            $response = Http::withToken($node->daemon_token ?? '')->timeout(3)
                ->get("{$scheme}://{$node->fqdn}:{$node->daemon_listen}/api/system");
            if ($response->successful()) {
                $node->setAttribute('wings_version', $response->json('version'));
                $node->setAttribute('cpu_threads', $response->json('cpu_count'));
                $node->setAttribute('architecture', $response->json('architecture'));
                $node->setAttribute('kernel', $response->json('kernel_version'));
            }
        } catch (\Illuminate\Http\Client\ConnectionException $exception) {
            // Editing must remain available when the node cannot be reached.
        }

        $allocations = $node->allocations->map(function ($allocation) {
            return [
                'id' => $allocation->id,
                'ip' => $allocation->ip,
                'alias' => $allocation->alias,
                'port' => $allocation->port,
            ];
        });

        return Inertia::render('Nodes/Edit', [
            'node' => $node,
            'allocations' => $allocations,
        ]);
    }

    public function update(Request $request, $id)
    {
        $request->merge([
            'ssl_mode' => $request->input('ssl_mode', $request->input('scheme')),
            'sftp_port' => $request->input('sftp_port', $request->input('daemon_sftp')),
            'sftp_alias' => $request->input('sftp_alias', $request->input('daemon_sftp_alias')),
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'fqdn' => 'required|string|max:255',
            'daemon_listen' => 'required|integer|min:1|max:65535',
            'ssl_mode' => 'required|in:http,https,https-reverse',
            'maintenance_mode' => 'required|boolean',
            'deployments' => 'required|boolean',
            'upload_size' => 'nullable|integer|min:1|max:2048000',
            'sftp_port' => 'required|integer|min:1|max:65535',
            'sftp_alias' => 'nullable|string',
            'tags' => 'nullable|string',
            'memory' => 'nullable|regex:/^(unlimited|[0-9]+)$/',
            'disk' => 'nullable|regex:/^(unlimited|[0-9]+)$/',
            'cpu' => 'nullable|regex:/^(unlimited|[0-9]+)$/',
            'uuid' => 'uuid|unique:nodes,uuid,' . $id,
            'daemon_sftp' => 'nullable|integer',
            'daemon_sftp_alias' => 'nullable|string',
        ]);

        $node = Node::findOrFail($id);

        // Regenerar tokens si están vacíos
        if (!$node->daemon_token_id || !$node->daemon_token) {
            $validated['daemon_token_id'] = Str::uuid();
            $validated['daemon_token'] = Str::random(64);
        }

        $validated['scheme'] = $validated['ssl_mode'];
        $validated['daemon_sftp'] = $validated['sftp_port'];
        $validated['daemon_sftp_alias'] = $validated['sftp_alias'] ?? '';
        foreach (['memory', 'disk', 'cpu'] as $resource) {
            $validated[$resource] = ($validated[$resource] ?? null) === 'unlimited'
                ? null : ($validated[$resource] ?? null);
        }
        unset($validated['ssl_mode'], $validated['sftp_port'], $validated['sftp_alias']);
        $node->update($validated);

        return redirect()->route('nodes.index')->with('success', 'Nodo actualizado correctamente.');
    }

    public function heartbeat($id)
    {
        $node = Node::findOrFail($id);
        $node->online = true;
        $node->last_heartbeat = now();
        $node->save();

        return response()->json(['message' => 'Heartbeat recibido']);
    }

    public function checkOfflineNodes()
    {
        $timeout = now()->subMinutes(2);
        Node::where('last_heartbeat', '<', $timeout)->update(['online' => false]);
    }


    public function configYaml($id)
    {
        $node = Node::findOrFail($id);

        $yaml = Yaml::dump([
            'debug' => false,
            'uuid' => $node->uuid,
            'token_id' => $node->daemon_token_id,
            'token' => $node->daemon_token,
            'api' => [
                'host' => '0.0.0.0',
                'port' => (int) $node->daemon_listen,
                'ssl' => [
                    'enabled' => $node->scheme === 'https',
                    'cert' => "/etc/letsencrypt/live/{$node->fqdn}/fullchain.pem",
                    'key' => "/etc/letsencrypt/live/{$node->fqdn}/privkey.pem",
                ],
                'upload_limit' => (int) $node->upload_size,
            ],
            'system' => [
                'data' => $node->daemon_base,
                'sftp' => ['bind_port' => (int) $node->daemon_sftp],
            ],
            'allowed_mounts' => [],
            'remote' => rtrim(config('app.url'), '/'),
        ], 4, 2, Yaml::DUMP_EMPTY_ARRAY_AS_SEQUENCE);

        return response()->make(
            $yaml,
            200,
            [
                'Content-Type' => 'text/yaml',
                'Content-Disposition' => 'attachment; filename="config.yml"',
            ]
        );
    }

    public function storeAllocation(Request $request, $id)
    {
        $node = Node::findOrFail($id);

        $validated = $request->validate([
            'ip' => 'required|ip',
            'alias' => 'nullable|string|max:255',
            'ports' => 'required|string',
        ]);

        $ports = collect(explode(',', $validated['ports']))
            ->flatMap(function ($port) {
                if (str_contains($port, '-')) {
                    [$start, $end] = explode('-', $port);
                    return range((int) $start, (int) $end);
                }
                return [(int) $port];
            })
            ->unique();

        $created = [];
        foreach ($ports as $port) {
            $alloc = $node->allocations()->firstOrCreate(
                [
                    'ip' => $validated['ip'],
                    'port' => $port,
                ],
                [
                    'alias' => $validated['alias'] ?? null,
                ]
            );
            $created[] = [
                'id' => $alloc->id,
                'ip' => $alloc->ip,
                'alias' => $alloc->alias,
                'port' => $alloc->port,
            ];
        }

        return response()->json([
            'message' => 'Allocations creadas correctamente',
            'allocations' => $created,
        ]);
    }

    public function destroyAllocation($nodeId, $allocationId)
    {
        $node = Node::findOrFail($nodeId);
        $node->allocations()->where('id', $allocationId)->delete();

        return response()->json(['message' => 'Allocation eliminada correctamente']);
    }

    public function destroy($id)
    {
        $node = Node::findOrFail($id);
        $node->delete();

        return redirect()->route('nodes.index')->with('success', 'Nodo eliminado correctamente.');
    }

    public function reset($id)
    {
        $node = Node::findOrFail($id);
        $node->daemon_token_id = (string) Str::uuid();
        $node->daemon_token = Str::random(64);
        $node->save();

        return response()->json([
            'message' => 'Claves del nodo restablecidas correctamente.',
            'daemon_token_id' => $node->daemon_token_id,
            'daemon_token' => $node->daemon_token,
        ]);
    }

    public function getCpuData(Request $request)
    {
        $node = $request->query('node_id') ? Node::find($request->query('node_id')) : Node::first();
        $threads = max(1, (int) ($node?->cpu_threads ?: 4));
        $load = function_exists('sys_getloadavg') ? (sys_getloadavg()[0] ?? 0.2) : 0.2;
        $currentRatio = round(min(1.0, max(0.02, $load / $threads)), 3);

        $cacheKey = 'node_cpu_history_' . ($node?->id ?? 0);
        $history = \Illuminate\Support\Facades\Cache::get($cacheKey, []);
        $now = now();

        if (empty($history)) {
            for ($i = 9; $i >= 1; $i--) {
                $history[] = [
                    'time' => $now->copy()->subSeconds($i * 5)->format('H:i:s'),
                    'value' => $currentRatio,
                ];
            }
        }

        $history[] = [
            'time' => $now->format('H:i:s'),
            'value' => $currentRatio,
        ];
        $history = array_slice($history, -10);
        \Illuminate\Support\Facades\Cache::put($cacheKey, $history, 300);

        return response()->json([
            'cpu_usage' => array_column($history, 'value'),
            'time_labels' => array_column($history, 'time'),
        ]);
    }

    public function getMemoryData(Request $request)
    {
        $node = $request->query('node_id') ? Node::find($request->query('node_id')) : Node::first();

        $currentRatio = 0.25;
        if (is_readable('/proc/meminfo')) {
            $meminfo = file_get_contents('/proc/meminfo');
            preg_match('/MemTotal:\s+(\d+)/', $meminfo, $totalMatch);
            preg_match('/MemAvailable:\s+(\d+)/', $meminfo, $availMatch);
            if (!empty($totalMatch[1]) && !empty($availMatch[1]) && (int) $totalMatch[1] > 0) {
                $totalKb = (int) $totalMatch[1];
                $usedKb = max(0, $totalKb - (int) $availMatch[1]);
                $currentRatio = round(min(1.0, max(0.01, $usedKb / $totalKb)), 3);
            }
        } elseif ($node && (int) $node->memory > 0) {
            $allocatedMb = (int) $node->servers()->sum('memory');
            $currentRatio = round(min(1.0, max(0.01, $allocatedMb / (int) $node->memory)), 3);
        }

        $cacheKey = 'node_mem_history_' . ($node?->id ?? 0);
        $history = \Illuminate\Support\Facades\Cache::get($cacheKey, []);
        $now = now();

        if (empty($history)) {
            for ($i = 9; $i >= 1; $i--) {
                $history[] = [
                    'time' => $now->copy()->subSeconds($i * 5)->format('H:i:s'),
                    'value' => $currentRatio,
                ];
            }
        }

        $history[] = [
            'time' => $now->format('H:i:s'),
            'value' => $currentRatio,
        ];
        $history = array_slice($history, -10);
        \Illuminate\Support\Facades\Cache::put($cacheKey, $history, 300);

        return response()->json([
            'memory_usage' => array_column($history, 'value'),
            'time_labels' => array_column($history, 'time'),
        ]);
    }

    public function getStorageData(Request $request)
    {
        $node = $request->query('node_id') ? Node::find($request->query('node_id')) : Node::first();

        $totalDiskBytes = @disk_total_space(base_path());
        $freeDiskBytes = @disk_free_space(base_path());

        if ($node && (int) $node->disk > 0) {
            $totalMb = (int) $node->disk;
            $allocatedMb = (int) $node->servers()->sum('disk');
            if ($allocatedMb > 0) {
                $usedMb = min($totalMb, $allocatedMb);
                $freeMb = max(0, $totalMb - $usedMb);
                return response()->json([$usedMb, $freeMb]);
            }
        }

        if ($totalDiskBytes && $freeDiskBytes !== false && $totalDiskBytes > 0) {
            $totalMb = (int) round($totalDiskBytes / 1048576);
            $freeMb = (int) round($freeDiskBytes / 1048576);
            $usedMb = max(0, $totalMb - $freeMb);
            return response()->json([$usedMb, $freeMb]);
        }

        $total = (int) ($node?->disk ?: 10240);
        $used = (int) ($node ? $node->servers()->sum('disk') : 0);
        $free = max(0, $total - $used);

        return response()->json([$used, $free]);
    }
}
