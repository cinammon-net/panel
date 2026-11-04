<?php

namespace App\Http\Middleware;

use App\Models\Maintenance;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Durante un mantenimiento con bloqueo del panel, los usuarios que no son
 * Owner/Admin ven la página de mantenimiento. Login y logout siguen funcionando
 * para que un admin pueda entrar.
 */
class BlockDuringMaintenance
{
    private const ALWAYS_ALLOWED = ['login', 'login/*', 'logout', 'forgot-password', 'reset-password*', 'two-factor*', 'auth/*', 'up'];

    public function handle(Request $request, Closure $next): Response
    {
        $m = Maintenance::current();

        if (!$m || !$m['active'] || !$m['block_access'] || !in_array('panel', $m['scope'], true)) {
            return $next($request);
        }
        if ($request->user()?->hasAnyRole(['Owner', 'Admin']) || $request->is(...self::ALWAYS_ALLOWED)) {
            return $next($request);
        }

        return Inertia::render('MaintenanceMode', ['maintenance' => $m])
            ->toResponse($request)
            ->setStatusCode(503)
            ->header('Retry-After', $m['ends_at'] ? (int) max(60, now()->diffInSeconds($m['ends_at'], false)) : 600);
    }
}
