<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Models\Subuser;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ServerSubusersController extends Controller
{
    private function authorizeManage(Request $request, Server $server): void
    {
        $user = $request->user();
        abort_unless(
            $user->id === $server->owner_id || $user->hasAnyRole(['Owner', 'Admin']),
            403,
            'Solo el propietario del servidor o un administrador puede gestionar los accesos.'
        );
    }

    public function index(Request $request, Server $server)
    {
        $this->authorizeManage($request, $server);

        $subusers = $server->subusers()
            ->with('user:id,name,email,avatar')
            ->latest()
            ->get()
            ->map(function ($subuser) {
                return [
                    'id' => $subuser->id,
                    'user_id' => $subuser->user_id,
                    'name' => $subuser->user->name ?? 'Usuario',
                    'email' => $subuser->user->email ?? '–',
                    'avatar' => $subuser->user->avatar ?? null,
                    'permissions' => $subuser->permissions ?? [],
                    'created_at' => $subuser->created_at?->toIso8601String(),
                ];
            });

        return Inertia::render('Servers/Subusers', [
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'uuid' => $server->uuid,
            ],
            'subusers' => $subusers,
            'owner' => [
                'id' => $server->owner?->id,
                'name' => $server->owner?->name,
                'email' => $server->owner?->email,
            ],
        ]);
    }

    public function store(Request $request, Server $server)
    {
        $this->authorizeManage($request, $server);

        $validated = $request->validate([
            'email' => 'required|string|max:255',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',
        ]);

        $targetUser = User::where('email', $validated['email'])
            ->orWhere('name', $validated['email'])
            ->first();

        if (!$targetUser) {
            return back()->withErrors(['email' => 'No se encontró ningún usuario con ese correo o nombre.']);
        }

        if ($targetUser->id === $server->owner_id) {
            return back()->withErrors(['email' => 'El usuario ya es el propietario de este servidor.']);
        }

        if ($server->subusers()->where('user_id', $targetUser->id)->exists()) {
            return back()->withErrors(['email' => 'Este usuario ya tiene acceso compartido al servidor.']);
        }

        $defaultPermissions = [
            'console.view',
            'console.commands',
            'power.start',
            'power.stop',
            'power.restart',
            'files.read',
            'files.write',
        ];

        $server->subusers()->create([
            'user_id' => $targetUser->id,
            'permissions' => $validated['permissions'] ?? $defaultPermissions,
        ]);

        return back()->with('success', "Se concedió acceso a {$targetUser->name} correctamente.");
    }

    public function update(Request $request, Server $server, Subuser $subuser)
    {
        $this->authorizeManage($request, $server);

        abort_unless($subuser->server_id === $server->id, 404);

        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string',
        ]);

        $subuser->update([
            'permissions' => $validated['permissions'],
        ]);

        return back()->with('success', 'Permisos actualizados correctamente.');
    }

    public function destroy(Request $request, Server $server, Subuser $subuser)
    {
        $this->authorizeManage($request, $server);

        abort_unless($subuser->server_id === $server->id, 404);

        $userName = $subuser->user?->name ?? 'Usuario';
        $subuser->delete();

        return back()->with('success', "Se revocó el acceso a {$userName}.");
    }
}
