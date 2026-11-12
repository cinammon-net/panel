<?php

namespace App\Support;

use App\Models\Allocation;
use App\Models\Egg;
use App\Models\Node;
use App\Models\Server;
use App\Models\User;
use App\Services\Daemon\WingsClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Servidores de amigo: cada "Amigo de Cinammon" puede crearse uno (config ranks.special.amigo.server)
 * desde el Rincón de Amigos. Se marcan con external_id "friend-<user>-<n>".
 * Si la persona pierde el rol, se suspenden; si lo recupera, vuelven a estar activos.
 */
class FriendServers
{
    public const PREFIX = 'friend-';

    public static function settings(): array
    {
        return array_replace([
            'enabled' => false, 'per_friend' => 1, 'categories' => [],
            'memory' => ['min' => 512, 'max' => 4096, 'step' => 256, 'default' => 2048],
            'cpu' => ['min' => 50, 'max' => 200, 'step' => 25, 'default' => 100],
            'disk' => ['min' => 2048, 'max' => 20480, 'step' => 1024, 'default' => 10240],
        ], (array) config('ranks.special.amigo.server', []));
    }

    /** Reglas de validación de los recursos que elige el amigo. */
    public static function rules(): array
    {
        $s = self::settings();
        $rule = fn (string $k) => ['required', 'integer', 'min:'.(int) $s[$k]['min'], 'max:'.(int) $s[$k]['max']];

        return ['memory' => $rule('memory'), 'cpu' => $rule('cpu'), 'disk' => $rule('disk')];
    }

    public static function query(User $user)
    {
        return Server::where('owner_id', $user->id)->where('external_id', 'like', self::PREFIX.'%');
    }

    /** Eggs que se pueden elegir, ordenados por categoría y nombre. */
    public static function eggs(): array
    {
        $cats = self::settings()['categories'];

        return Egg::query()->whereNotNull('category')
            ->when($cats, fn ($q) => $q->whereIn('category', $cats))
            ->orderBy('category')->orderBy('name')
            ->get(['id', 'uuid', 'name', 'category', 'image', 'updated_at'])
            ->map(fn (Egg $e) => ['id' => $e->id, 'name' => $e->name, 'category' => $e->category, 'icon' => $e->image_url])
            ->values()->all();
    }

    /** @param array{memory:int,cpu:int,disk:int} $res */
    public static function create(User $user, string $name, int $eggId, array $res): Server
    {
        $s = self::settings();
        $egg = Egg::whereKey($eggId)->whereNotNull('category')
            ->when($s['categories'], fn ($q) => $q->whereIn('category', $s['categories']))->first();
        if (! $egg) {
            throw ValidationException::withMessages(['egg_id' => 'Ese juego o app no está disponible para servidores de amigo.']);
        }

        $server = DB::transaction(function () use ($user, $name, $egg, $s, $res) {
            // Bloquea al usuario para que dos clics a la vez no creen dos servidores
            User::whereKey($user->id)->lockForUpdate()->first();
            $count = self::query($user)->count();
            if ($count >= (int) $s['per_friend']) {
                throw ValidationException::withMessages(['name' => 'Ya tienes tu servidor de amigo. Si quieres otro, pide al Owner que borre el actual o pídelo en el pozo de los deseos.']);
            }

            $node = Node::where('maintenance_mode', false)->orderBy('id')->first();
            if (! $node) {
                throw ValidationException::withMessages(['name' => 'Ahora mismo no hay ningún nodo disponible. Inténtalo más tarde.']);
            }

            $allocation = Allocation::whereNull('server_id')
                ->where('node_id', $node->id)
                ->whereNotIn('id', Server::whereNotNull('allocation_id')->pluck('allocation_id'))
                ->orderBy('port')->first()
                ?? Allocation::create([
                    'node_id' => $node->id,
                    'ip' => Allocation::where('node_id', $node->id)->value('ip') ?? '0.0.0.0',
                    'port' => max(25565, (int) Allocation::where('node_id', $node->id)->max('port') + 1),
                ]);

            $images = json_decode($egg->docker_images ?? '{}', true) ?: [];
            $server = Server::create([
                'uuid' => (string) Str::uuid(),
                'uuid_short' => substr((string) Str::uuid(), 0, 8),
                'node_id' => $node->id,
                'allocation_id' => $allocation->id,
                'name' => $name,
                'active' => 1,
                'owner_id' => $user->id,
                'memory' => (int) $res['memory'],
                'swap' => 0,
                'disk' => (int) $res['disk'],
                'io' => 100, // como los gratuitos: los de pago tienen prioridad de disco
                'cpu' => (int) $res['cpu'],
                'egg_id' => $egg->id,
                'startup' => $egg->startup ?? '',
                'image' => reset($images) ?: '',
                'status' => 0,
            ]);
            $server->forceFill(['external_id' => self::PREFIX.$user->id.'-'.($count + 1).'-'.Str::lower(Str::random(4))])->save();
            $allocation->forceFill(['server_id' => $server->id])->save();

            return $server;
        });

        try {
            app(WingsClient::class)->provision($server);
        } catch (\Throwable $e) {
            Log::warning('Servidor de amigo: no se pudo aprovisionar en Wings: '.$e->getMessage());
        }

        return $server;
    }

    /** Suspende o reactiva los servidores de amigo según si la persona tiene el rol. */
    public static function syncAccess(User $user, bool $isFriend): void
    {
        $servers = self::query($user)->get();
        foreach ($servers as $server) {
            $active = (int) ($server->active ?? 1) !== 0;
            if ($isFriend && ! $active) {
                $server->forceFill(['active' => 1])->save();
            } elseif (! $isFriend && $active) {
                $server->forceFill(['active' => 0, 'status' => 0])->save();
                try {
                    app(WingsClient::class)->power($server, 'kill');
                } catch (\Throwable) {
                }
            }
        }
    }
}
