<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Models\ServerFolder;
use App\Models\ServerFolderMember;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ServerFolderController extends Controller
{
    /** Crear una nueva carpeta o subcarpeta. */
    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user, 401);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'parent_id' => ['nullable', 'integer', 'exists:server_folders,id'],
            'color' => ['nullable', 'string', 'max:30'],
            'icon' => ['nullable', 'string', 'max:50'],
        ]);

        if (!empty($data['parent_id'])) {
            $parent = ServerFolder::where('id', $data['parent_id'])->where('user_id', $user->id)->first();
            abort_unless($parent, 403, 'La carpeta superior no existe o no te pertenece.');
        }

        $folder = ServerFolder::create([
            'user_id' => $user->id,
            'parent_id' => $data['parent_id'] ?? null,
            'name' => trim($data['name']),
            'color' => $data['color'] ?? null,
            'icon' => $data['icon'] ?? null,
        ]);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'folder' => $folder], 201);
        }

        return back()->with('success', 'Carpeta creada con exito.');
    }

    /** Actualizar nombre o ubicacion de una carpeta. */
    public function update(Request $request, ServerFolder $folder)
    {
        $user = $request->user();
        abort_unless($user && $folder->user_id === $user->id, 403, 'No tienes permiso sobre esta carpeta.');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'parent_id' => ['nullable', 'integer', 'exists:server_folders,id'],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        if (!empty($data['parent_id'])) {
            abort_if($data['parent_id'] === $folder->id, 422, 'Una carpeta no puede ser subcarpeta de si misma.');
            $descendants = ServerFolder::descendantIdsAndSelf($folder->id, $user->id);
            abort_if(in_array((int) $data['parent_id'], $descendants, true), 422, 'No puedes mover una carpeta dentro de sus propias subcarpetas.');
        }

        $folder->update([
            'name' => trim($data['name']),
            'parent_id' => $data['parent_id'] ?? null,
            'color' => $data['color'] ?? $folder->color,
        ]);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'folder' => $folder]);
        }

        return back()->with('success', 'Carpeta actualizada correctamente.');
    }

    /** Eliminar carpeta (sus subcarpetas se eliminan y los servidores quedan sin carpeta). */
    public function destroy(Request $request, ServerFolder $folder)
    {
        $user = $request->user();
        abort_unless($user && $folder->user_id === $user->id, 403, 'No tienes permiso sobre esta carpeta.');

        $folder->delete();

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'Carpeta eliminada.');
    }

    /** Asignar o mover un servidor a una carpeta (o quitarlo). */
    public function assign(Request $request)
    {
        $user = $request->user();
        abort_unless($user, 401);

        $data = $request->validate([
            'server_id' => ['required', 'integer', 'exists:servers,id'],
            'folder_id' => ['nullable', 'integer'],
        ]);

        $server = Server::findOrFail($data['server_id']);
        // Verificar acceso al servidor
        $canAccess = $server->owner_id === $user->id
            || $user->hasAnyRole(['Owner', 'Admin'])
            || $server->subusers()->where('user_id', $user->id)->exists();
        abort_unless($canAccess, 403, 'No tienes acceso a este servidor.');

        if (!empty($data['folder_id'])) {
            $folder = ServerFolder::where('id', $data['folder_id'])->where('user_id', $user->id)->firstOrFail();
            ServerFolderMember::updateOrCreate(
                ['user_id' => $user->id, 'server_id' => $server->id],
                ['folder_id' => $folder->id]
            );
        } else {
            ServerFolderMember::where('user_id', $user->id)->where('server_id', $server->id)->delete();
        }

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'Servidor organizado.');
    }
}
