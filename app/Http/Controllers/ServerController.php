<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Models\Node;
use App\Models\User;
use App\Models\Allocation;
use App\Models\Egg;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class ServerController extends Controller
{
    // Listar servidores del usuario autenticado
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Server::with('egg', 'node') // Asegúrate de que 'node' esté relacionado con el servidor
            ->where('owner_id', $user->id);

        // Filtro de búsqueda
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Ordenar por el parámetro dado
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');
        $query->orderBy($sort, $direction);

        // Paginación
        $paginated = $query->paginate(15)->withQueryString();

        // Manipular los datos para mostrarlos de manera personalizada
        $servers = $paginated->getCollection()->map(function ($server) {
            return [
                'id' => $server->id,
                'uuid' => $server->uuid,
                'name' => $server->name,
                'description' => $server->description ?? '-',
                'status' => $server->status ? 'online' : 'offline',
                'node' => $server->node->name ?? 'Unknown', // Asegúrate de tener la relación 'node'
                'egg' => optional($server->egg)->name ?? 'Unknown',
                'allocation' => ($server->ip ?? '') . ':' . ($server->port ?? ''),
                'servers' => 0, // Esto lo puedes ajustar si tienes más servidores en la relación
            ];
        });

        // Establecer la colección personalizada para la paginación
        $paginated->setCollection($servers);

        return Inertia::render('Servers', [
            'servers' => $paginated,
            'filters' => $request->only('search', 'sort', 'direction'),
            'availableTags' => [],
        ]);
    }

    // Vista para crear un nuevo servidor
    public function create()
    {
        // Asegúrate de pasar los datos necesarios al frontend
        $nodes = Node::all(); // Obteniendo los nodos
        $owners = User::all(); // Obteniendo los usuarios
        $allocations = Allocation::all(); // Obteniendo las asignaciones
        $eggs = Egg::all(); // Obteniendo los eggs

        return Inertia::render('Servers/Create', [
            'nodes' => $nodes,
            'owners' => $owners,
            'allocations' => $allocations,
            'eggs' => $eggs,
        ]);
    }

    // Crear nuevo servidor con validación
    public function store(Request $request)
    {
        $user = $request->user();

        // Validación de los datos
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'node_id' => 'required|integer|exists:nodes,id',
            'owner_id' => 'required|integer|exists:users,id',
            'memory' => 'nullable|integer|min:0',
            'swap' => 'nullable|integer|min:0',
            'disk' => 'nullable|integer|min:0',
            'cpu' => 'nullable|integer|min:0',
            'egg_id' => 'required|integer|exists:eggs,id',
            'startup_command' => 'required|string',
            'image' => 'required|string',
            'description' => 'nullable|string',
            'skip_scripts' => 'nullable|boolean',
            'external_id' => 'nullable|string|max:255',
            'database_limit' => 'nullable|integer|min:0',
            'allocation_limit' => 'nullable|integer|min:0',
            'threads' => 'nullable|integer|min:0',
            'backup_limit' => 'nullable|integer|min:0',
            'status' => 'nullable|boolean',
            'oom_killer' => 'nullable|boolean',
            'docker_labels' => 'nullable|string',
            'allocation_id' => 'nullable|integer',
            'primary_allocation' => 'nullable|string',
            'additional_allocations' => 'nullable|array',
            'run_install_script' => 'nullable|boolean',
            'start_after_install' => 'nullable|boolean',
            'bungee_version' => 'nullable|string',
            'bungee_jar_file' => 'nullable|string',
            'cpu_pinning' => 'nullable|boolean',
            'swap_memory' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Validación exitosa
        $data = $validator->validated();

        // Generación del UUID
        $uuid = (string) Str::uuid();
        $data['uuid'] = $uuid;
        $data['uuid_short'] = substr($uuid, 0, 8);

        // Asignar el usuario actual como propietario
        $data['owner_id'] = $user->id;

        // Valores predeterminados si no se proporcionan
        $data['active'] = 1;
        $data['status'] = $data['status'] ?? 1;

        // Crear el servidor
        $server = Server::create($data);

        return response()->json(['message' => 'Servidor creado correctamente', 'server' => $server], 201);
    }

    public function apiServers(Request $request)
    {
            $user = $request->user();

            $query = Server::with('egg', 'node')->where('owner_id', $user->id);

            if ($request->has('search')) {
                $query->where('name', 'like', '%' . $request->search . '%');
            }

            $sort = $request->input('sort', 'name');
            $direction = $request->input('direction', 'asc');
            $query->orderBy($sort, $direction);

            $paginated = $query->paginate(15);

            $servers = $paginated->getCollection()->map(function ($server) {
                return [
                    'id' => $server->id,
                    'uuid' => $server->uuid,
                    'name' => $server->name,
                    'description' => $server->description ?? '-',
                    'status' => $server->status ? 'online' : 'offline',
                    'node' => $server->node->name ?? 'Unknown',
                    'egg' => optional($server->egg)->name ?? 'Unknown',
                    'allocation' => ($server->ip ?? '') . ':' . ($server->port ?? ''),
                ];
            });

            // Retornamos JSON con paginación
            return response()->json([
                'data' => $servers,
                'meta' => [
                    'total' => $paginated->total(),
                    'per_page' => $paginated->perPage(),
                    'current_page' => $paginated->currentPage(),
                    'last_page' => $paginated->lastPage(),
                ],
                'links' => [
                    'first' => $paginated->url(1),
                    'last' => $paginated->url($paginated->lastPage()),
                    'prev' => $paginated->previousPageUrl(),
                    'next' => $paginated->nextPageUrl(),
                ],
            ])->setStatusCode(200);
    }
}