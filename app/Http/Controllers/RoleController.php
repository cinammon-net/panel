<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Node;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;

class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Role::query();

        if ($search = $request->input('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($request->filled('sort') && $request->filled('direction')) {
            $query->orderBy($request->input('sort'), $request->input('direction'));
        }

        $roles = $query
            ->with(['node', 'permissions'])
            ->withCount('users')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        $allPermissionsCount = Permission::count();

        $roles->getCollection()->transform(function ($role) use ($allPermissionsCount) {
            $rolePermissions = $role->permissions->pluck('name')->toArray();

            return [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $rolePermissions,
                'has_all_permissions' => count($rolePermissions) === $allPermissionsCount,
                'users_count' => $role->users_count,
                'node' => $role->node ? $role->node->name : null,
                'is_default' => $role->is_default,
            ];
        });

        return Inertia::render('Roles', [
            'roles' => $roles,
            'filters' => $request->only(['search', 'sort', 'direction', 'per_page']),
        ]);
    }

    public function create(): Response
    {
        $permissions = Permission::all()->groupBy(function ($permission) {
            return explode('.', $permission->name)[0];
        });

        $nodes = Node::select('id', 'name')->get();

        return Inertia::render('Roles/Create', [
            'groupedPermissions' => $permissions,
            'nodes' => $nodes,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
            'node_id' => 'nullable|exists:nodes,id',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
            'node_id' => $validated['node_id'] ?? null,
        ]);

        if (!empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        return redirect()->route('roles.index')->with('success', 'Role created successfully.');
    }

    public function edit(Role $role): Response
    {
        $permissions = Permission::all()->groupBy(function ($permission) {
            return explode('.', $permission->name)[0];
        });

        $nodes = Node::select('id', 'name')->get();

        return Inertia::render('Roles/Edit', [
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'node_id' => $role->node_id,
                'permissions' => $role->permissions->pluck('name'),
                'is_default' => $role->is_default,
            ],
            'groupedPermissions' => $permissions,
            'nodes' => $nodes,
        ]);
    }

    public function update(Request $request, Role $role)
    {
        if ($role->is_default) {
            return back()->withErrors(['error' => 'You cannot edit a default role.']);
        }

        $validated = $request->validate([
            'name' => 'required|string|unique:roles,name,' . $role->id,
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
            'node_id' => 'nullable|exists:nodes,id',
        ]);

        $role->update([
            'name' => $validated['name'],
            'node_id' => $validated['node_id'] ?? null,
        ]);

        $role->syncPermissions($validated['permissions'] ?? []);

        return back()->with('success', 'Role updated successfully.');
    }

    public function destroy(Role $role)
    {
        if ($role->is_default) {
            return back()->withErrors(['error' => 'You cannot delete a default role.']);
        }

        $role->delete();

        return redirect()->route('roles.index')->with('success', 'Role deleted successfully.');
    }
}
