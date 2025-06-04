<?php

namespace App\Http\Controllers;

use App\Models\Node;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

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

        // Generar tokens si no vienen en la petición
        $validated['daemon_token_id'] = Str::uuid();
        $validated['daemon_token'] = Str::random(64);

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

        $yaml = <<<YAML
debug: false
uuid: {$node->uuid}
token_id: {$node->daemon_token_id}
token: {$node->daemon_token}
api:
  url: "https://{$node->fqdn}"
  base_path: "/remote"
  host: 0.0.0.0
  port: 8080
  ssl:
    enabled: true
    cert: /etc/letsencrypt/live/{$node->fqdn}/fullchain.pem
    key: /etc/letsencrypt/live/{$node->fqdn}/privkey.pem
  upload_limit: 256
system:
  data: /var/lib/cinammon/volumes
sftp:
  bind_port: {$node->daemon_sftp}
  allowed_mounts: []
  remote: "https://{$node->fqdn}"
YAML;

        return response()->make(
            $yaml,
            200,
            [
                'Content-Type' => 'text/yaml',
                'Content-Disposition' => 'attachment; filename="config.yml"',
            ]
        );
    }
}
