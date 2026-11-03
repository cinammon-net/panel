<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * El dominio de la consola de Wings usa la misma aplicación que el panel, pero solo expone lo
 * imprescindible: el inicio y cierre de sesión y los datos del monitor (la página es un archivo estático).
 */
class RestrictWingsHost
{
    private const ALLOWED = ['login', 'logout', 'api/wings/telemetry'];

    public function handle(Request $request, Closure $next): Response
    {
        $host = (string) config('panel.wings_host');

        if ($host !== '' && strcasecmp($request->getHost(), $host) === 0 && ! $request->is(self::ALLOWED)) {
            abort(404);
        }

        return $next($request);
    }
}
