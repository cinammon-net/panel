<?php

namespace App\Http\Controllers;

use App\Models\Node;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Laravel\Pail\ValueObjects\Origin\Console;

use function Laravel\Prompts\error;
use Symfony\Component\Yaml\Yaml;

class NodeController extends Controller
{
    public function index(Request $request)
    {
        $query = Node::query();

        // Búsqueda por nombre
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Campos permitidos para orden
        $sortable = ['name', 'fqdn', 'scheme', 'maintenance_mode'];
        $sort = in_array($request->get('sort'), $sortable) ? $request->get('sort') : 'name';
        $direction = $request->get('direction') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sort, $direction);

        // Paginación
        $perPage = $request->integer('per_page', 25);
        $paginated = $query->paginate($perPage)->withQueryString();

        // Formateo para el frontend
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
        // Asegurarse de que el nodo exista
        $node = Node::find($id);

        if (!$node) {
            return redirect()->route('nodes.index')->with('error', 'Nodo no encontrado.');
        }

        return Inertia::render('NodeShow', [
            'node' => $node,
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

        // Asignar un UUID antes de crear el registro
        $validated['uuid'] = (string) Str::uuid();

        // Crear el nodo con el UUID generado
        Node::create($validated);

        return redirect()->route('nodes.index')->with('success', 'Nodo creado correctamente.');
    }

    public function edit($id)
    {
        // Buscar el nodo por su ID
        $node = Node::findOrFail($id);

        // Pasar los datos del nodo a la vista con Inertia
        return Inertia::render('Nodes/Edit', [
            'node' => $node, 
        ]);
    }

    public function update(Request $request, $id)
    {
        try {
            // Validación y actualización del nodo
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
            // Manejo de errores
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
        $configFilePath = '/path/to/config.yml';  // Asegúrate de que esta ruta sea la correcta

        if (!file_exists($configFilePath)) {
            return response()->json(['error' => 'Configuration file not found'], 404);
        }
        $config = Yaml::parseFile($configFilePath);
        return response()->json($config);
        return response()->json($config);
    }

    public function saveConfig(Request $request)
    {
        // Validar que el contenido de la configuración sea una cadena válida
        $request->validate([
            'config' => 'required|string',
        ]);

        // Ruta donde se guarda el archivo de configuración
        $configPath = storage_path('daemon/config.yml');

        // Guardar la nueva configuración en el archivo
        file_put_contents($configPath, $request->config);

        return response()->json(['message' => 'Configuration saved successfully']);
    }
}
