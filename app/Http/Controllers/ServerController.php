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
        $query = Server::query();

        // Filtro búsqueda
        if ($request->has('search')) {
            $query->where('servers.name', 'like', '%' . $request->search . '%');
        }

        // Orden dinámico
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        // Si es un campo de relación, se hace join manual y se selecciona adecuadamente
        switch ($sort) {
            case 'egg':
                $query->leftJoin('eggs', 'servers.egg_id', '=', 'eggs.id')
                    ->select('servers.*', 'eggs.name as egg_name')
                    ->orderBy('eggs.name', $direction);
                break;

            case 'username':
                $query->leftJoin('users', 'servers.owner_id', '=', 'users.id')
                    ->select('servers.*', 'users.name as user_name')
                    ->orderBy('users.name', $direction);
                break;

            case 'node':
                $query->leftJoin('nodes', 'servers.node_id', '=', 'nodes.id')
                    ->select('servers.*', 'nodes.name as node_name')
                    ->orderBy('nodes.name', $direction);
                break;

            case 'allocation':
                $query->leftJoin('allocations', 'servers.allocation_id', '=', 'allocations.id')
                    ->select('servers.*', 'allocations.ip as allocation_ip', 'allocations.port as allocation_port')
                    ->orderBy('allocations.ip', $direction)
                    ->orderBy('allocations.port', $direction);
                break;

            case 'status':
                $query->orderByRaw('CASE WHEN servers.status = 1 THEN 0 ELSE 1 END')
                    ->orderBy('servers.name', $direction);
                break;

            case 'database':
                $query->orderBy('servers.database_limit', $direction);
                break;

            case 'cpu':
                $query->orderBy('servers.cpu', $direction);
                break;

            case 'memory':
                $query->orderBy('servers.memory', $direction);
                break;

            case 'backups':
                $query->orderBy('servers.backup_limit', $direction);
                break;
                
            default:
                $query->orderBy('servers.' . $sort, $direction);
                break;
        }

        // Paginar resultados
        $paginated = $query->paginate(15)->withQueryString();

        // Hacer relaciones manualmente porque no usamos with()
        $serverIds = $paginated->pluck('id');
        $relatedServers = Server::with(['egg', 'owner', 'node', 'allocation'])
            ->whereIn('id', $serverIds)
            ->get()
            ->keyBy('id');

        // Formatear salida
        $servers = $paginated->getCollection()->map(function ($server) use ($relatedServers) {
            $full = $relatedServers[$server->id] ?? null;

            return [
                'id' => $server->id,
                'uuid' => $server->uuid,
                'name' => $server->name,
                'status' => $server->status ? 'online' : 'offline',
                'egg' => $full?->egg?->name ?? '–',
                'username' => $full?->owner?->name ?? 'Unknown',
                'node' => $full?->node?->name ?? 'Unknown',
                'allocation' => $full?->allocation
                    ? $full->allocation->ip . ':' . $full->allocation->port
                    : '–',
                'database' => $server->database_limit ?? 0,
                'cpu' => $server->cpu ?? 0,
                'memory' => $server->memory ?? 0,
                'backups' => $server->backup_limit ?? 0,
            ];
        });

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

    // Guardar un nuevo servidor
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'uuid' => 'nullable|string|exists:servers,uuid',
            'name' => 'required|string|max:255',
            'node_id' => 'required|integer|exists:nodes,id',
            'owner_id' => 'required|integer|exists:users,id',
            'allocation_id' => 'nullable|integer|exists:allocations,id',
            'description' => 'nullable|string',
            'primary_allocation_id' => 'nullable|integer|exists:allocations,id',
            'egg_id' => 'required|integer|exists:eggs,id',
            'startup' => 'required|string',
            'image' => 'required|string',
            'run_install_script' => 'nullable|boolean',
            'start_after_install' => 'nullable|boolean',
            'cpu_pinning' => 'nullable|boolean',
            'swap_memory' => 'nullable|string',
            'oom_killer' => 'nullable|boolean',
            'backups' => 'nullable|integer|min:0',
            'install_script' => 'nullable|string',
            'additional_allocation_ids' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $data = $validator->validated();
        if (isset($data['primary_allocation_id'])) {
            $data['allocation_id'] = $data['primary_allocation_id'];
            unset($data['primary_allocation_id']);
        }

        if (!empty($data['uuid'])) {
            // 🔁 Editar
            $server = Server::where('uuid', $data['uuid'])->firstOrFail();
            $server->update($data);
        } else {
            // ➕ Crear
            $data['uuid'] = (string) Str::uuid();
            $data['uuid_short'] = substr($data['uuid'], 0, 8);
            $data['active'] = 1;
            $data['status'] = 1;
            $server = Server::create($data);
        }

        if (isset($validated['additional_allocations'])) {
            Allocation::whereIn('id', $validated['additional_allocations'])
                ->update(['server_id' => $server->id]);
        }

        return redirect()->route('servers.index')->with('success', 'Servidor guardado correctamente.');
    }

    public function update(Request $request, Server $server)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'externalId' => 'nullable|string|max:255',
            'nodeId' => 'required|integer|exists:nodes,id',
            'ownerId' => 'required|integer|exists:users,id',
            'primaryAllocationId' => 'nullable|integer|exists:allocations,id',
            'additionalAllocationIds' => 'nullable|array',
            'description' => 'nullable|string',
            'egg' => 'required|integer|exists:eggs,id',
            'runInstallScript' => 'required|boolean',
            'startAfterInstall' => 'required|boolean',
            'startupCommand' => 'required|string',

            'cpuLimit' => 'required|string|in:limited,unlimited',
            'memoryLimit' => 'required|string|in:limited,unlimited',
            'diskLimit' => 'required|string|in:limited,unlimited',
            'cpuPinning' => 'required|boolean',
            'swapMemory' => 'required|string|in:limited,unlimited,disabled',
            'oomKiller' => 'required|boolean',
            'backups' => 'required|integer|min:0',
            'dockerImage' => 'required|string',
            'installScript' => 'nullable|string',
            'labels' => 'nullable|array',
            'variables' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $data = $validator->validated();

        // Mapeo y transformación de campos si hace falta
        $server->update([
            'name' => $data['name'],
            'external_id' => $data['externalId'],
            'node_id' => $data['nodeId'],
            'owner_id' => $data['ownerId'],
            'allocation_id' => $data['primaryAllocationId'],
            'description' => $data['description'],
            'egg_id' => $data['egg'],
            'run_install_script' => $data['runInstallScript'],
            'start_after_install' => $data['startAfterInstall'],
            'startup' => $data['startupCommand'],
            'cpu_limit' => $data['cpuLimit'] === 'unlimited' ? 0 : 1,
            'memory_limit' => $data['memoryLimit'] === 'unlimited' ? 0 : 1,
            'disk_limit' => $data['diskLimit'] === 'unlimited' ? 0 : 1,
            'cpu_pinning' => $data['cpuPinning'],
            'swap_memory' => $data['swapMemory'],
            'oom_killer' => $data['oomKiller'],
            'backup_limit' => $data['backups'],
            'image' => $data['dockerImage'],
            'install_script' => $data['installScript'],
            'labels' => $data['labels'],
            'variables' => $data['variables'],
        ]);

        // También puedes actualizar relaciones si lo necesitas

        return redirect()->route('servers.index')->with('success', 'Servidor actualizado exitosamente.');
    }


    public function apiServers(Request $request)
    {
        $user = $request->user();

        $query = Server::with('egg', 'node')->where('owner_id', $user->id);

        if ($request->has('search')) {
            $query->where('servers.name', 'like', '%' . $request->search . '%');
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

    public function edit(Server $server)
    {
        // Cargar relaciones necesarias
        $server->load(['node', 'owner']);

        // Decodificar imágenes de los eggs
        $eggs = Egg::with('variables')
            ->select('id', 'name', 'startup', 'docker_images')
            ->get();

        $eggs->each(function ($egg) {
            $egg->docker_images = json_decode($egg->docker_images, true);
        });

        return Inertia::render('Servers/Edit', [
            'server' => $server,
            'nodes' => Node::all(),
            'owners' => User::all(),
            'allocations' => Allocation::all(),
            'eggs' => $eggs,
        ]);
    }

    public function destroy($uuid)
    {
        $server = Server::where('uuid', $uuid)->firstOrFail();
        $server->delete();

        return redirect()->route('servers.index')->with('success', 'Servidor eliminado correctamente.');
    }
}
