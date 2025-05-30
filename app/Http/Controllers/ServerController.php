<?php

namespace App\Http\Controllers;

use App\Models\Server;
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

        $query = Server::with('egg')
            ->where('owner_id', $user->id);

        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');
        $query->orderBy($sort, $direction);

        $paginated = $query->paginate(15)->withQueryString();

        $servers = $paginated->getCollection()->map(function ($server) {
            return [
                'id' => $server->id,
                'uuid' => $server->uuid,
                'name' => $server->name,
                'description' => $server->description ?? '-',
                'status' => $server->installed ? 'online' : 'offline',
                'node' => $server->node ?? 'Unknown',
                'egg' => optional($server->egg)->name ?? 'Unknown',
                'nest' => '-',
                'username' => $server->username ?? 'Unknown',
                'allocation' => ($server->ip ?? '') . ':' . ($server->port ?? ''),
                'database' => 'N/A',
                'servers' => 0,
            ];
        });

        $paginated->setCollection($servers);

        return Inertia::render('Servers', [
            'servers' => $paginated,
            'filters' => $request->only('search', 'sort', 'direction'),
            'availableTags' => [],
        ]);
    }

    public function create()
    {
        return Inertia::render('Servers/Create');
    }

    // Crear nuevo servidor con validación
    public function store(Request $request)
    {
        $user = $request->user();

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

        $data = $validator->validated();

        $uuid = (string) Str::uuid();
        $data['uuid'] = $uuid;
        $data['uuid_short'] = substr($uuid, 0, 8);

        // Forzar que el owner sea el usuario actual para seguridad
        $data['owner_id'] = $user->id;

        // Valores por defecto si no vienen
        $data['active'] = 1;
        $data['status'] = $data['status'] ?? 1;

        $server = Server::create($data);

        return response()->json(['message' => 'Servidor creado', 'server' => $server], 201);
    }
}
