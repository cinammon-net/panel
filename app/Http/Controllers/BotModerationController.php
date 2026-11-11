<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Models\User;
use App\Services\Daemon\WingsClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Sanciones sobre los servicios desde Discord: ver la cuenta de un usuario y suspender o
 * reactivar todos sus servidores. Quien lo pide se identifica por su Discord vinculado.
 *
 * - Ver: Owner, Admin, Moderator y Helper.
 * - Suspender: Owner, Admin y Moderator.
 * - Reactivar: Owner y Admin.
 * - Nadie puede tocar a un Owner, y solo un Owner puede tocar a un Admin.
 */
class BotModerationController extends Controller
{
    private const VIEW = ['Owner', 'Admin', 'Moderator', 'Moderador', 'Helper'];
    private const SUSPEND = ['Owner', 'Admin', 'Moderator', 'Moderador'];
    private const RESTORE = ['Owner', 'Admin'];

    public function show(string $staffId, string $targetId)
    {
        $this->staff($staffId, self::VIEW);
        $target = User::where('discord_id', $targetId)->first();

        return response()->json(['account' => $target ? $this->account($target) : null]);
    }

    public function servers(Request $request, string $staffId, string $targetId, WingsClient $wings)
    {
        $data = $request->validate([
            'action' => 'required|in:suspend,unsuspend',
            'reason' => 'nullable|string|max:400',
        ]);
        $staff = $this->staff($staffId, $data['action'] === 'suspend' ? self::SUSPEND : self::RESTORE);
        $target = User::where('discord_id', $targetId)->first();
        abort_unless($target, 404, 'Esa persona no tiene su Discord vinculado con el panel, así que no se le pueden tocar servidores.');
        abort_if($target->id === $staff->id, 422, 'No puedes sancionar tus propios servidores.');
        abort_if($target->hasRole('Owner'), 403, 'No se pueden sancionar los servidores de un Owner.');
        abort_if($target->hasRole('Admin') && ! $staff->hasRole('Owner'), 403, 'Solo un Owner puede sancionar a un Admin.');

        $suspend = $data['action'] === 'suspend';
        $changed = [];
        foreach (Server::where('owner_id', $target->id)->where('active', $suspend ? 1 : 0)->get() as $server) {
            $server->forceFill($suspend ? ['active' => 0, 'status' => 0] : ['active' => 1])->save();
            if ($suspend) {
                try {
                    $wings->power($server, 'kill');
                } catch (\Throwable) {
                }
            }
            $changed[] = ['id' => $server->id, 'name' => $server->name];
        }
        \App\Support\Ranks::sync($target);
        Log::info(sprintf('Bot: %s %s servidores de %s (%d). Motivo: %s', $staff->name, $suspend ? 'suspende' : 'reactiva', $target->name, count($changed), $data['reason'] ?? '-'));

        return response()->json(['changed' => $changed, 'account' => $this->account($target->fresh())]);
    }

    private function account(User $u): array
    {
        return [
            'name' => $u->name,
            'roles' => $u->getRoleNames()->values(),
            'created_at' => $u->created_at?->toIso8601String(),
            'servers' => Server::where('owner_id', $u->id)->orderBy('name')->get(['id', 'name', 'active'])
                ->map(fn (Server $s) => ['id' => $s->id, 'name' => $s->name, 'active' => (bool) $s->active])->values(),
        ];
    }

    private function staff(string $discordId, array $roles): User
    {
        $user = User::where('discord_id', $discordId)->first();
        abort_unless($user, 404, 'not_linked');
        abort_unless($user->hasAnyRole($roles), 403, 'Tu rango del panel no permite hacer eso.');

        return $user;
    }
}
