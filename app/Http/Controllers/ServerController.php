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

        $query = Server::with(['egg', 'node', 'allocation', 'owner']) 
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
                'status' => $server->status ? 'online' : 'offline',
                'egg' => optional($server->egg)->name ?? '–',
                'username' => optional($server->owner)->name ?? 'Unknown',
                'allocation' => $server->allocation
                    ? $server->allocation->ip . ':' . $server->allocation->port
                    : '–',
                'database' => $server->database_limit ?? 0,
                'cpu' => $server->cpu ?? 0,
                'memory' => $server->memory ?? 0,
                'backups' => $server->backup_limit ?? 0,
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
        $nodes = Node::all(); // Obteniendo los nodos
        $owners = User::all(); // Obteniendo los usuarios
        $allocations = Allocation::all(); // Obteniendo las asignaciones
        $eggs = Egg::with('variables')
            ->select('id', 'name', 'startup', 'docker_images')
            ->get();

        $eggs->each(function ($egg) {
            $egg->docker_images = json_decode($egg->docker_images, true);
        });
        $variables = $eggs->flatMap(function ($egg) {
            return $egg->variables->map(function ($variable) use ($egg) {
                return [
                    'egg_id' => $egg->id,
                    'name' => $variable->name,
                    'default_value' => $variable->default_value,
                    'description' => $variable->description,
                    'rules' => $variable->rules,
                ];
            });
        });

        
        return Inertia::render('Servers/Create', [
            'nodes' => $nodes,
            'owners' => $owners,
            'allocations' => $allocations,
            'eggs' => $eggs,
            'variables' => $variables,
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
            'startup' => 'required|string',
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
            'primary_allocation' => 'nullable|integer|exists:allocations,id',
            'allocation_id' => 'nullable|integer',
            'additional_allocations' => 'nullable|array',
            'run_install_script' => 'nullable|boolean',
            'start_after_install' => 'nullable|boolean',
            'bungee_version' => 'nullable|string',
            'bungee_jar_file' => 'nullable|string',
            'cpu_pinning' => 'nullable|boolean',
            'swap_memory' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }
        // Validación exitosa
        $data = $validator->validated();
        $data['allocation_id'] = $data['primary_allocation'] ?? null;

        // Generación del UUID
        $uuid = (string) Str::uuid();
        $data['uuid'] = $uuid;
        $data['uuid_short'] = substr($uuid, 0, 8);

        // Asignar el usuario actual como propietario
        $data['owner_id'] = $data['owner_id'] ?? $user->id;

        // Valores predeterminados si no se proporcionan
        $data['active'] = 1;
        $data['status'] = $data['status'] ?? 1;

        // Crear el servidor
        $server = Server::create($data);
        if ($server) {
            // Redirigir al usuario a la lista de servidores con un mensaje de éxito
            return redirect()->route('servers.index')->with('success', 'Servidor creado exitosamente.');
        }
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
                    'allocation' => optional($server->allocation)?->ip && optional($server->allocation)?->port
                        ? $server->allocation->ip . ':' . $server->allocation->port
                        : '–',
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