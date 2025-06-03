<?php

namespace App\Http\Controllers;

use App\Models\Node;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Symfony\Component\Yaml\Yaml;


class NodeController extends Controller
{
    public function index(Request $request)
    {
        $query = Node::query();

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
                'ssl' => $node->scheme === 'https',
                'maintenance' => (bool) $node->maintenance_mode,
                'health' => $node->maintenance_mode ? '⚠️' : '✅',
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
            'daemon_listen' => 'required|integer',
            'ssl_mode' => 'required|string',
            'maintenance_mode' => 'required|boolean',
            'deployments' => 'required|boolean',
            'upload_size' => 'nullable|integer|min:1024|max:2048000',
            'sftp_port' => 'required|integer',
            'sftp_alias' => 'nullable|string',
            'tags' => 'nullable|string',
            'memory' => 'required|string',
            'disk' => 'required|string',
            'cpu' => 'required|string',
            'uuid' => 'uuid|unique:nodes,uuid',
            'daemon_sftp' => 'nullable|integer',
            'daemon_sftp_alias' => 'nullable|string',
        ]);

        $validated['scheme'] = $validated['ssl_mode'];
        unset($validated['ssl_mode']);

        $validated['maintenance_mode'] = (bool) $validated['maintenance_mode'];
        $validated['deployments'] = (bool) $validated['deployments'];

        $validated['sftp_alias'] = $validated['sftp_alias'] ?? '';
        $validated['tags'] = $validated['tags'] ?? '';

        $validated['memory'] = $validated['memory'] === 'unlimited' ? null : $validated['memory'];
        $validated['disk'] = $validated['disk'] === 'unlimited' ? null : $validated['disk'];
        $validated['cpu'] = $validated['cpu'] === 'unlimited' ? null : $validated['cpu'];

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
        $node = Node::findOrFail($id);

        return Inertia::render('Nodes/Edit', [
            'node' => $node,
        ]);
    }

    public function update(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'fqdn' => 'required|string|max:255',
                'daemon_listen' => 'required|integer',
                'ssl_mode' => 'required|string',
                'maintenance_mode' => 'required|boolean',
                'deployments' => 'required|boolean',
                'upload_size' => 'nullable|integer|min:1024|max:2048000',
                'sftp_port' => 'required|integer',
                'sftp_alias' => 'nullable|string',
                'tags' => 'nullable|string',
                'memory' => 'required|string',
                'disk' => 'required|string',
                'cpu' => 'required|string',
                'uuid' => 'uuid|unique:nodes,uuid',
            ]);

            $node = Node::findOrFail($id);
            $node->update($validated);

            return redirect()->route('nodes.index')->with('success', 'Nodo actualizado correctamente.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return redirect()->back()->with('error', 'Error al actualizar el nodo: ' . $e->getMessage());
        }
    }

    public function getCpuData()
    {
        $nodes = Node::orderBy('time', 'desc')->take(10)->get();
        return response()->json([
            'cpu_usage' => $nodes->pluck('cpu')->toArray(),
            'time_labels' => $nodes->pluck('time')->toArray(),
        ]);
    }

    public function getMemoryData()
    {
        $nodes = Node::orderBy('time', 'desc')->take(10)->get();
        return response()->json([
            'memory_usage' => $nodes->pluck('memory')->toArray(),
            'time_labels' => $nodes->pluck('time')->toArray(),
        ]);
    }

    public function getStorageData()
    {
        $nodes = Node::orderBy('time', 'desc')->take(10)->get();
        return response()->json([
            'disk_usage' => $nodes->pluck('disk')->toArray(),
            'time_labels' => $nodes->pluck('time')->toArray(),
        ]);
    }

    public function showConfig()
    {
        $configFilePath = '/path/to/config.yml';

        if (!file_exists($configFilePath)) {
            return response()->json(['error' => 'Configuration file not found'], 404);
        }
        $config = Yaml::parseFile($configFilePath);
        return response()->json($config);
    }

    public function saveConfig(Request $request)
    {
        $request->validate([
            'config' => 'required|string',
        ]);

        $configPath = storage_path('daemon/config.yml');

        file_put_contents($configPath, $request->config);

        return response()->json(['message' => 'Configuration saved successfully']);
    }

    public function configYaml($id)
    {
        $node = Node::findOrFail($id);

        return response()->make(
            <<<YAML
debug: false
uuid: {$node->uuid}
token_id: {$node->daemon_token_id}
token: {$node->daemon_token}
api:
  host: 0.0.0.0
  port: 8080
  ssl:
    enabled: true
    cert: /etc/letsencrypt/live/{$node->fqdn}/fullchain.pem
    key: /etc/letsencrypt/live/{$node->fqdn}/privkey.pem
upload_limit:
system:
  data: /var/lib/cinammon/volumes
sftp:
  bind_port:
  allowed_mounts: []
  remote: "https://{$node->fqdn}"
YAML,
            200,
            ['Content-Type' => 'text/yaml', 'Content-Disposition' => 'attachment; filename="config.yml"']
        );
    }
}
