<?php

namespace App\Support;

use App\Models\Server;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Registro de actividad de cada servidor (tabla server_activity_logs).
 * Lo usan los controladores con descripciones propias y el middleware LogServerActivity
 * para todo lo demás; si una petición ya se registró, el middleware no la repite.
 */
class ServerActivity
{
    /** Máximo de entradas que se guardan por servidor. */
    private const KEEP = 5000;

    public static function log(Server|int $server, ?User $user, string $action, string $description, ?string $ip = null, string $source = 'panel', ?array $actor = null): void
    {
        $serverId = $server instanceof Server ? $server->id : $server;
        try {
            DB::table('server_activity_logs')->insert([
                'server_id' => $serverId,
                'user_id' => $user?->id,
                'user_name' => mb_substr((string) ($user?->name ?? $actor['name'] ?? 'Sistema'), 0, 120),
                'user_email' => $user?->email ?? $actor['email'] ?? null,
                'user_avatar' => $user?->avatar && strlen((string) $user->avatar) <= 500 ? (string) $user->avatar : null,
                'source' => $source,
                'action' => mb_substr($action, 0, 80),
                'description' => mb_substr(trim(preg_replace('/[\x00-\x1f\x7f]+/', ' ', $description)), 0, 600),
                'ip' => $ip,
                'created_at' => now(),
            ]);
            // Limpieza ocasional: solo se guardan las últimas KEEP entradas de cada servidor.
            if (random_int(1, 50) === 1) {
                $cut = DB::table('server_activity_logs')->where('server_id', $serverId)->orderByDesc('id')->skip(self::KEEP)->value('id');
                if ($cut) {
                    DB::table('server_activity_logs')->where('server_id', $serverId)->where('id', '<=', $cut)->delete();
                }
            }
        } catch (\Throwable $e) {
            report($e);
        }

        if (app()->bound('request') && $source === 'panel') {
            request()->attributes->set('server_activity_logged', true);
        }
    }

    /** Los avatares subidos se guardan como "avatars/x.png" (disco public): se sirven en /storage/... */
    private static function avatarUrl(?string $avatar): ?string
    {
        if (! $avatar) {
            return null;
        }
        if (preg_match('#^(https?:)?//|^data:image/|^/#i', $avatar)) {
            return $avatar;
        }

        return '/storage/'.ltrim($avatar, '/');
    }

    /** Entradas para la página de Actividad, más recientes primero. */
    public static function recent(int $serverId, int $limit = 500): array
    {
        return DB::table('server_activity_logs as l')->leftJoin('users as u', 'u.id', '=', 'l.user_id')
            ->where('l.server_id', $serverId)->orderByDesc('l.id')->limit($limit)
            ->get(['l.*', 'u.avatar as current_avatar', 'u.name as current_name'])
            ->map(fn ($r) => [
                'id' => (string) $r->id,
                'user' => ['name' => $r->current_name ?? $r->user_name ?? 'Sistema', 'email' => $r->user_email ?? '', 'avatar' => self::avatarUrl($r->current_avatar ?? $r->user_avatar)],
                'source' => $r->source,
                'action' => $r->action,
                'description' => $r->description,
                'ip' => $r->ip ?? '',
                'created_at' => \Illuminate\Support\Carbon::parse($r->created_at)->toIso8601String(),
            ])->all();
    }
}
