<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Secciones de administración (nodos, eggs, usuarios, claves de Wings…): solo Owner y Admin.
 * Admite roles adicionales como parámetro: `admin:Moderator,Helper`.
 */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next, string ...$extraRoles): Response
    {
        abort_unless($request->user()?->hasAnyRole(['Owner', 'Admin', ...$extraRoles]), 403, 'Solo los administradores pueden acceder a esta sección.');

        return $next($request);
    }
}
