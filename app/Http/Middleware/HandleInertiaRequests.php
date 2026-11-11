<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'flash' => fn(): array => ['success' => $request->session()->get('success'), 'discordCode' => $request->session()->get('discordCode')],
            // Botones de "Entrar con ..." (solo los proveedores configurados en el .env)
            'socialProviders' => fn (): array => \App\Http\Controllers\Auth\SocialAuthController::enabled(),
            // Mantenimiento activo o próximo: aviso global para todos (también sin sesión)
            'maintenance' => fn () => \App\Models\Maintenance::current(),
            // Ofertas y novedades publicadas (cada vista filtra por su ubicación)
            'announcements' => fn () => \App\Models\Announcement::liveList(),
            // Enlace a la tienda (no en la demo, que no tiene billing)
            'billingUrl' => \App\Support\Panel::demoMode() ? null : rtrim((string) config('services.billing.url'), '/'),
            // Rangos comprados y roles automáticos del usuario (recalculados como mucho cada 10 min)
            'badges' => function () use ($request) {
                if (!$user = $request->user()) {
                    return [];
                }
                \App\Support\Ranks::syncIfStale($user);

                return \App\Support\Ranks::badges($user);
            },

            'name' => config('app.name'),
            'quote' => [
                'message' => trim($message),
                'author' => trim($author),
            ],

            'ziggy' => fn(): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],

            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'demoMode' => \App\Support\Panel::demoMode(),
            // Datos del servidor de la ruta actual que necesita el menú lateral (p. ej. mostrar "Plugins y mods").
            'currentServer' => function () use ($request) {
                $server = $request->route('server');
                if (! $server instanceof \App\Models\Server) {
                    $server = is_numeric($server) ? \App\Models\Server::find($server) : null;
                }

                $addons = \App\Support\MinecraftAddons::kind($server);

                return $server ? [
                    'minecraft' => $addons !== null,
                    'addons' => $addons,
                    'players' => \App\Support\MinecraftAddons::hasPlayerLists($server),
                    'gta' => \App\Support\GtaServers::kind($server),
                    // Para la pantalla de entrada al servidor
                    'id' => $server->id,
                    'name' => $server->name,
                    'egg' => $server->egg?->name,
                    'egg_icon' => $server->egg?->image_url,
                    'category' => $server->egg?->category,
                    'apps' => $server->supportsWebApps() || $server->supportsJsApps(),
                    // Solo si es una URL: un banner subido (data:) pesa demasiado para ir en cada página.
                    'banner' => $server->banner && ! str_starts_with($server->banner, 'data:') ? $server->banner : null,
                ] : null;
            },

            // Aviso de actualizaciones pendientes (solo admins; se cachea en UpdateChecker)
            'updates' => fn () => ($user = $request->user()) && $user->hasAnyRole(['Owner', 'Admin'])
                ? \App\Support\UpdateChecker::available()
                : null,


            'serverLock' => fn () => ($user = $request->user()) ? [
                'has_code' => $user->hasSecurityCode(),
                'active' => $user->securityLockActive(),
                'until' => $user->lock_enabled_until?->toIso8601String(),
                'unlocked' => \App\Http\Middleware\EnsureServerUnlocked::isUnlocked($request->session()),
            ] : null,

            // ✅ Aquí se inyectan roles y permisos para TODAS las páginas Inertia
            'auth' => [
                'user' => fn() => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'avatar' => $request->user()->avatar_url,
                    'roles' => $request->user()->getRoleNames(), // ← Spatie roles
                    'permissions' => $request->user()->getAllPermissions()->pluck('name'), // ← Spatie permissions
                ] : null,
            ],
        ];
    }
}
