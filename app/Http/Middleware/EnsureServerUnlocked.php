<?php

namespace App\Http\Middleware;

use App\Models\Server;
use Closure;
use Illuminate\Contracts\Session\Session;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloqueo de seguridad por cliente: mientras esté activo, solo el propietario
 * (con su código) y los subusuarios que él haya añadido pueden entrar a sus servidores.
 */
class EnsureServerUnlocked
{
    public const SESSION_KEY = 'server_lock.unlocked_until';
    public const INTENDED_KEY = 'server_lock.intended';
    public const IDLE_MINUTES = 30;

    /** Rutas de gestión que los administradores siguen pudiendo usar (el propietario sí necesita el código). */
    private const ADMIN_ROUTES = ['servers.edit', 'servers.update', 'servers.destroy'];

    public static function isUnlocked(Session $session): bool
    {
        return (int) $session->get(self::SESSION_KEY, 0) > time();
    }

    public static function markUnlocked(Session $session): void
    {
        $session->put(self::SESSION_KEY, now()->addMinutes(self::IDLE_MINUTES)->getTimestamp());
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $server = $this->server($request);
        $owner = $server?->owner;

        if (! $user || ! $owner) {
            return $next($request);
        }

        if ($user->id !== $owner->id) {
            $isAdmin = $user->hasAnyRole(['Owner', 'Admin']);
            $isSubuser = $server->subusers()->where('user_id', $user->id)->exists();

            // Cualquier ruta de un servidor: solo su propietario, sus subusuarios y los administradores.
            abort_unless($isAdmin || $isSubuser, 403, 'No tienes permiso para acceder a este servidor.');

            // Acciones por uuid (reinstalar, suspender, transferir, borrar...): no para subusuarios.
            if ($request->route('uuid') !== null) {
                abort_unless($isAdmin, 403, 'No tienes permiso para gestionar este servidor.');

                return $next($request);
            }

            // El propietario da acceso añadiendo subusuarios a su servidor, con o sin bloqueo.
            if ($isSubuser) {
                return $next($request);
            }

            // Un administrador solo entra a un servidor protegido para gestionarlo desde la lista.
            if (in_array($request->route()?->getName(), self::ADMIN_ROUTES, true) || ! $owner->securityLockActive()) {
                return $next($request);
            }

            abort(403, 'Este servidor está protegido por su propietario.');
        }

        if (! $owner->hasSecurityCode()) {
            return $this->deny($request, 'setup');
        }

        if (! $owner->securityLockActive()) {
            return $next($request);
        }

        if (! self::isUnlocked($request->session())) {
            return $this->deny($request, 'locked');
        }

        self::markUnlocked($request->session());

        return $next($request);
    }

    private function server(Request $request): ?Server
    {
        $parameter = $request->route('server');

        if ($parameter instanceof Server) {
            return $parameter;
        }

        if (is_scalar($parameter)) {
            return Server::find($parameter);
        }

        $uuid = $request->route('uuid');

        return is_scalar($uuid) ? Server::where('uuid', $uuid)->orWhere('id', $uuid)->first() : null;
    }

    private function deny(Request $request, string $reason): Response
    {
        $setup = $reason === 'setup';
        $message = $setup
            ? 'Crea tu código de seguridad para acceder a tus servidores.'
            : 'Introduce tu código de seguridad para acceder a este servidor.';

        if (! $request->header('X-Inertia') && $request->expectsJson()) {
            return response()->json(['message' => $message, 'lock' => $reason], 423);
        }

        if ($request->isMethod('GET')) {
            $request->session()->put(self::INTENDED_KEY, $request->fullUrl());
        }

        return $setup
            ? redirect()->route('security.edit')->with('status', 'server-lock-setup')
            : redirect()->route('server-lock.unlock');
    }
}
