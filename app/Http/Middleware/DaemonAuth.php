<?php

namespace App\Http\Middleware;

use App\Models\Node;
use Closure;
use Illuminate\Http\Request;

class DaemonAuth
{
    public function handle(Request $request, Closure $next)
    {
        $credentials = explode('.', $request->bearerToken() ?? '', 2);
        if (count($credentials) !== 2 || $credentials[0] === '' || $credentials[1] === '') {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        $node = Node::where('daemon_token_id', $credentials[0])->first();
        if (!$node || !$node->daemon_token || !hash_equals($node->daemon_token, $credentials[1])) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        $request->attributes->set('node', $node);

        return $next($request);
    }
}
