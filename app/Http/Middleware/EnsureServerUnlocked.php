<?php

namespace App\Http\Middleware;

use App\Models\Server;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Session\Session;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloqueo de seguridad por cliente: mientras esté activo, solo el propietario
 * (con su código) y los subusuarios que él haya añadido pueden entrar a sus servidores.
 */
class EnsureServerUnlocked
{
    public const SESSION_KEY = 'server_lock.unlocked_until';
    public const INTENDED_KEY = 'server_lock.intended';
    public const COOKIE_KEY = 'server_lock_remember';
    public const IDLE_MINUTES = 30;
    public const ALLOWED_REMEMBER_MINUTES = [15, 30, 120, 720, 1440];

    /** Rutas de gestión que los administradores siguen pudiendo usar (el propietario sí necesita el código). */
    private const ADMIN_ROUTES = ['servers.edit', 'servers.update', 'servers.destroy'];

    public static function codeFingerprint(User $user): string
    {
        return hash('sha256', $user->id.'|'.(string) $user->lock_code);
    }

    public static function resolveUnlockedUntil(Session $session, ?Request $request = null, ?User $user = null): ?int
    {
        $sessionUntil = (int) $session->get(self::SESSION_KEY, 0);
        if ($sessionUntil > time()) {
            return $sessionUntil;
        }

        if ($request && $user && $user->hasSecurityCode()) {
            $raw = $request->cookie(self::COOKIE_KEY);
            if (is_string($raw) && $raw !== '') {
                $payload = json_decode($raw, true);
                if (is_array($payload)) {
                    $uid = (int) ($payload['uid'] ?? 0);
                    $exp = (int) ($payload['exp'] ?? 0);
                    $version = (string) ($payload['v'] ?? '');

                    if ($uid === $user->id && $exp > time() && hash_equals(self::codeFingerprint($user), $version)) {
                        $session->put(self::SESSION_KEY, $exp);

                        return $exp;
                    }
                }
            }
        }

        return null;
    }

    public static function isUnlocked(Session $session, ?Request $request = null, ?User $user = null): bool
    {
        return self::resolveUnlockedUntil($session, $request, $user) !== null;
    }

    public static function markUnlocked(Session $session, ?User $user = null, int $minutes = self::IDLE_MINUTES): int
    {
        $ttl = in_array($minutes, self::ALLOWED_REMEMBER_MINUTES, true) ? $minutes : self::IDLE_MINUTES;
        $expiresAt = now()->addMinutes($ttl)->getTimestamp();
        $session->put(self::SESSION_KEY, $expiresAt);

        if ($user && $user->hasSecurityCode()) {
            $payload = json_encode([
                'uid' => $user->id,
                'v' => self::codeFingerprint($user),
                'exp' => $expiresAt,
            ]);

            if ($payload !== false) {
                $secure = request()?->isSecure() ?? false;
                Cookie::queue(self::COOKIE_KEY, $payload, $ttl, '/', null, $secure, true, false, 'lax');
            }
        }

        return $expiresAt;
    }

    public static function forgetUnlocked(Session $session): void
    {
        $session->forget(self::SESSION_KEY);
        Cookie::queue(Cookie::forget(self::COOKIE_KEY));
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
            if (! ($isAdmin || $isSubuser)) {
                return $this->lockedView(
                    $request,
                    $server,
                    'Acceso restringido',
                    'No tienes permiso para acceder a este servidor.',
                    null,
                    403
                );
            }

            // Acciones por uuid (reinstalar, suspender, transferir, borrar...): no para subusuarios.
            if ($request->route('uuid') !== null) {
                if (! $isAdmin) {
                    return $this->lockedView(
                        $request,
                        $server,
                        'Acceso restringido',
                        'No tienes permiso para gestionar este servidor.',
                        null,
                        403
                    );
                }

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

            return $this->lockedView(
                $request,
                $server,
                'Servidor protegido',
                'Este servidor está protegido por su propietario.',
                'Los administradores solo pueden gestionarlo desde la lista de servidores (reinstalar, suspender o borrar), pero su consola, archivos y ajustes permanecen bloqueados.',
                403
            );
        }

        if (! $owner->hasSecurityCode()) {
            return $this->deny($request, 'setup');
        }

        if (! $owner->securityLockActive()) {
            return $next($request);
        }

        if (! self::isUnlocked($request->session(), $request, $user)) {
            return $this->deny($request, 'locked');
        }

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

    private function lockedView(Request $request, ?Server $server, string $title, string $message, ?string $note, int $jsonStatus): Response
    {
        if (! $request->header('X-Inertia') && $request->expectsJson()) {
            return response()->json(['message' => $message, 'lock' => 'protected'], $jsonStatus);
        }

        return Inertia::render('security/locked', [
            'serverName' => $server?->name ?? 'Servidor',
            'title' => $title,
            'message' => $message,
            'note' => $note,
        ])->toResponse($request);
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
