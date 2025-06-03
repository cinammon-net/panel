<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class DaemonAuth
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        // Aquí compara el token con el daemon_token guardado en tu DB o config
        // Ejemplo simple: buscar token en tabla nodes (ajusta a tu modelo)
        $node = \App\Models\Node::where('daemon_token', $token)->first();

        if (!$node) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Puedes guardar info del nodo para usar después si quieres
        $request->attributes->set('node', $node);

        return $next($request);
    }
}
