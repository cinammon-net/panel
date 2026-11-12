<?php

namespace App\Support;

use App\Models\RoleGrant;
use App\Models\Server;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Role;

/**
 * Rangos comprados y roles automáticos.
 *
 * Cada rol gestionado aquí existe en el usuario si y solo si tiene una concesión
 * activa en role_grants. Los roles de staff (Owner, Admin…) y Members no se tocan.
 */
class Ranks
{
    public const PERK_KEYS = ['discount', 'backups', 'databases', 'allocations', 'priority'];

    /** Nombres de rol gestionados (comprables + automáticos). */
    public static function managedRoles(): array
    {
        return array_values(array_unique([
            ...array_column(config('ranks.purchasable'), 'name'),
            ...array_column(config('ranks.auto'), 'name'),
            ...array_column(config('ranks.special', []), 'name'),
        ]));
    }

    public static function isPurchasable(string $role): bool
    {
        return in_array($role, array_column(config('ranks.purchasable'), 'name'), true);
    }

    /** Concede (o renueva) un rango comprado en billing. */
    public static function grant(User $user, string $role, string $externalId, array $perks, ?\DateTimeInterface $expiresAt): RoleGrant
    {
        $grant = RoleGrant::updateOrCreate(
            ['external_id' => $externalId],
            [
                'user_id' => $user->id,
                'role' => $role,
                'source' => 'billing',
                'perks' => array_intersect_key($perks, array_flip(self::PERK_KEYS)),
                'expires_at' => $expiresAt,
            ]
        );
        self::apply($user);

        return $grant;
    }

    public static function revoke(string $externalId): ?User
    {
        $grant = RoleGrant::where('external_id', $externalId)->first();
        if (!$grant) {
            return null;
        }
        $user = $grant->user;
        $grant->delete();
        if ($user) {
            self::apply($user);
        }

        return $user;
    }

    /**
     * Recalcula los roles automáticos del usuario según sus servidores, quita lo
     * caducado y deja sus roles de Spatie alineados con las concesiones activas.
     */
    public static function sync(User $user): void
    {
        // Solo cuentan los servicios activos (al cancelar, el servidor queda suspendido con active = 0).
        $servers = Server::with('egg:id,category')
            ->where('owner_id', $user->id)
            ->where(fn ($q) => $q->whereNull('active')->orWhere('active', '!=', 0))
            ->get(['id', 'egg_id', 'created_at']);
        $auto = config('ranks.auto');
        $wanted = [];

        if ($servers->isNotEmpty()) {
            $wanted[] = $auto['cliente']['name'];
            foreach ($servers as $server) {
                $cat = $server->egg?->category;
                $cat = $cat === 'generic' ? 'bots' : $cat;
                if ($cat && isset($auto[$cat])) {
                    $wanted[] = $auto[$cat]['name'];
                }
            }
            if ($servers->count() >= 3) {
                $wanted[] = $auto['coleccionista']['name'];
            }
            if ($servers->sortBy('created_at')->first()?->created_at?->lt(now()->subMonths(6))) {
                $wanted[] = $auto['veterano']['name'];
            }
        }
        $wanted = array_values(array_unique($wanted));

        RoleGrant::where('user_id', $user->id)->where('source', 'auto')->whereNotIn('role', $wanted)->delete();
        foreach ($wanted as $role) {
            RoleGrant::firstOrCreate(['user_id' => $user->id, 'source' => 'auto', 'role' => $role]);
        }

        self::ownerRank($user);
        self::apply($user);
    }

    /** El Owner siempre tiene el rango más alto (Leyenda Cinammon), sin caducidad y con las ventajas al máximo. */
    private static function ownerRank(User $user): void
    {
        $top = config('ranks.purchasable.leyenda.name', 'Leyenda Cinammon');
        if ($user->hasRole('Owner')) {
            RoleGrant::updateOrCreate(
                ['user_id' => $user->id, 'source' => 'staff', 'role' => $top],
                ['perks' => ['backups' => 50, 'databases' => 50, 'allocations' => 50, 'priority' => true], 'expires_at' => null]
            );
        } else {
            RoleGrant::where('user_id', $user->id)->where('source', 'staff')->delete();
        }
    }

    /** Igual que sync() pero como mucho una vez cada 10 min por usuario (se llama en cada página). */
    public static function syncIfStale(User $user): void
    {
        if (Cache::add("ranks:synced:{$user->id}", 1, now()->addMinutes(10))) {
            self::sync($user);
        }
    }

    /** Alinea los roles de Spatie gestionados con las concesiones activas. */
    public static function apply(User $user): void
    {
        RoleGrant::where('user_id', $user->id)->whereNotNull('expires_at')->where('expires_at', '<=', now())->delete();

        $active = RoleGrant::where('user_id', $user->id)->active()->pluck('role')->unique()->all();
        $current = $user->getRoleNames()->all();

        foreach (self::managedRoles() as $role) {
            $has = in_array($role, $current, true);
            $should = in_array($role, $active, true);
            if ($should && !$has) {
                Role::findOrCreate($role, 'web');
                $user->assignRole($role);
            } elseif (!$should && $has) {
                $user->removeRole($role);
            }
        }
        Cache::forget("ranks:perks:{$user->id}");

        // Servidor de amigo: activo solo mientras tenga el rol (el Owner siempre lo conserva)
        $friendRole = config('ranks.special.amigo.name', 'Amigo de Cinammon');
        FriendServers::syncAccess($user, in_array($friendRole, $active, true) || $user->hasRole('Owner'));
    }

    /** Ventajas efectivas: la mejor de cada tipo entre los rangos activos. */
    public static function perks(?User $user): array
    {
        $base = ['discount' => 0, 'backups' => 0, 'databases' => 0, 'allocations' => 0, 'priority' => false];
        if (!$user) {
            return $base;
        }

        return Cache::remember("ranks:perks:{$user->id}", 300, function () use ($user, $base) {
            foreach (RoleGrant::where('user_id', $user->id)->whereIn('source', ['billing', 'staff'])->active()->get() as $grant) {
                foreach ($grant->perks ?? [] as $key => $value) {
                    if ($key === 'priority') {
                        $base['priority'] = $base['priority'] || (bool) $value;
                    } elseif (array_key_exists($key, $base)) {
                        $base[$key] = max($base[$key], (int) $value);
                    }
                }
            }

            return $base;
        });
    }

    public static function bonus(?User $user, string $perk): int
    {
        return (int) (self::perks($user)[$perk] ?? 0);
    }

    /** Insignias para la interfaz: rangos comprados primero, luego los automáticos. */
    public static function badges(User $user): array
    {
        $grants = RoleGrant::where('user_id', $user->id)->active()->orderByRaw("case when source in ('staff', 'billing') then 0 when source = 'friend' then 1 else 2 end")->get();
        $meta = [];
        foreach (config('ranks.purchasable') as $r) {
            $meta[$r['name']] = $r + ['kind' => 'rank'];
        }
        foreach (config('ranks.auto') as $r) {
            $meta[$r['name']] = $r + ['kind' => 'auto'];
        }
        foreach (config('ranks.special', []) as $r) {
            $meta[$r['name']] = $r + ['kind' => 'special'];
        }

        return $grants->unique('role')->filter(fn ($g) => isset($meta[$g->role]))->map(fn ($g) => [
            'name' => $g->role,
            'kind' => $meta[$g->role]['kind'],
            'color' => $meta[$g->role]['color'],
            'icon' => $meta[$g->role]['icon'],
            'hint' => $meta[$g->role]['hint'] ?? null,
            'expires_at' => $g->expires_at?->toIso8601String(),
        ])->values()->all();
    }
}
