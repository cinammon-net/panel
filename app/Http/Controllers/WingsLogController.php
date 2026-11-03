<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Support\WingsEvents;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Consola de eventos de Wings: cada rol ve lo que le corresponde (ver App\Support\WingsEvents). */
class WingsLogController extends Controller
{
    /** Todos los servidores: solo Owner/Admin (todo) y Moderator/Helper (operativo). */
    public function adminEvents(Request $request): JsonResponse
    {
        return response()->json(WingsEvents::present($request->user()))->header('Cache-Control', 'no-store');
    }

    public function serverPage(Request $request, Server $server): Response
    {
        return Inertia::render('Servers/WingsLog', [
            'server' => ['id' => $server->id, 'name' => $server->name, 'uuid' => $server->uuid, 'owner_id' => $server->owner_id],
            'tier' => WingsEvents::tier($request->user()),
        ]);
    }

    public function serverEvents(Request $request, Server $server): JsonResponse
    {
        return response()->json(WingsEvents::present($request->user(), $server))->header('Cache-Control', 'no-store');
    }
}
