<?php

namespace App\Http\Controllers;

use App\Models\Allocation;
use App\Models\Egg;
use App\Models\Node;
use App\Models\Server;
use App\Models\UserBoosterCore;
use App\Services\Daemon\WingsClient;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BoosterCoreController extends Controller
{
    /**
     * Aplica Overclock Dinamico a un servidor del usuario autenticado.
     */
    public function applyOverclock(Request $request)
    {
        $user = $request->user();
        $serverId = (int) $request->input('server_id');
        $server = Server::where('id', $serverId)->where('owner_id', $user->id)->firstOrFail();

        $core = UserBoosterCore::firstOrCreate(
            ['user_id' => $user->id],
            [
                'discord_id' => (string) ($user->discord_id ?? ''),
                'mode' => 'none',
                'boost_active' => true,
                'boost_since' => now(),
            ]
        );

        $core->applyOverclock($server);

        return back()->with('success', "Overclock (+3 GB RAM, +150% CPU) aplicado con exito a {$server->name}.");
    }

    /**
     * Aplica Escudo de Inmunidad Anti-Suspension a un servidor del usuario.
     */
    public function applyShield(Request $request)
    {
        $user = $request->user();
        $serverId = (int) $request->input('server_id');
        $server = Server::where('id', $serverId)->where('owner_id', $user->id)->firstOrFail();

        $core = UserBoosterCore::firstOrCreate(
            ['user_id' => $user->id],
            [
                'discord_id' => (string) ($user->discord_id ?? ''),
                'mode' => 'none',
                'boost_active' => true,
                'boost_since' => now(),
            ]
        );

        $core->applyShield($server);

        return back()->with('success', "Escudo de inmunidad anti-suspension activado para {$server->name}.");
    }

    /**
     * Despliega un Pod a la carta desde el panel web.
     */
    public function applyPod(Request $request, WingsClient $wings)
    {
        $user = $request->user();

        $core = UserBoosterCore::firstOrCreate(
            ['user_id' => $user->id],
            [
                'discord_id' => (string) ($user->discord_id ?? ''),
                'mode' => 'none',
                'boost_active' => true,
                'boost_since' => now(),
            ]
        );

        if ($core->allocated_server_id && ($srv = Server::find($core->allocated_server_id))) {
            return back()->with('error', 'Ya posees un Pod Booster activo en tu cuenta.');
        }

        $category = $request->input('category', 'bots');
        $egg = null;

        if ($category === 'bots') {
            $egg = Egg::where('name', 'like', '%node.js%')->orWhere('name', 'like', '%python%')->first()
                ?? Egg::where('category', 'bots')->first();
        } elseif ($category === 'games') {
            $egg = Egg::where('name', 'like', '%SA-MP%')->orWhere('name', 'like', '%Rust%')->first()
                ?? Egg::where('category', 'games')->first();
        } elseif ($category === 'web') {
            $egg = Egg::where('name', 'like', '%WebHost%')->first()
                ?? Egg::where('category', 'web')->first();
        } else {
            $egg = Egg::where('name', 'like', '%Paper%')->first()
                ?? Egg::where('category', 'minecraft')->first();
        }

        if (!$egg) {
            $egg = Egg::orderBy('id')->firstOrFail();
        }

        $node = Node::where('maintenance_mode', false)->orderBy('id')->first() ?? Node::orderBy('id')->first();
        abort_unless($node, 503, 'No hay nodos disponibles para aprovisionar el servidor.');

        $allocation = Allocation::whereNull('server_id')
            ->where('node_id', $node->id)
            ->whereNotIn('id', Server::whereNotNull('allocation_id')->pluck('allocation_id'))
            ->orderBy('port')
            ->first();

        if (! $allocation) {
            $nextPort = max(25565, (int) Allocation::where('node_id', $node->id)->max('port') + 1);
            $allocation = Allocation::create([
                'node_id' => $node->id,
                'ip' => Allocation::where('node_id', $node->id)->value('ip') ?? '0.0.0.0',
                'port' => $nextPort,
            ]);
        }

        $images = json_decode($egg->docker_images ?? '{}', true) ?: [];
        $serverName = 'Pod Booster · ' . $user->name;

        $server = Server::create([
            'uuid' => (string) Str::uuid(),
            'uuid_short' => substr((string) Str::uuid(), 0, 8),
            'node_id' => $node->id,
            'allocation_id' => $allocation->id,
            'name' => $serverName,
            'description' => 'Pod exclusivo por Server Boost en Discord',
            'active' => 1,
            'owner_id' => $user->id,
            'memory' => 4096,
            'swap' => 0,
            'disk' => 15360,
            'io' => 500,
            'cpu' => 200,
            'egg_id' => $egg->id,
            'startup' => $egg->startup ?? '',
            'image' => reset($images) ?: '',
            'status' => 0,
            'is_booster_overclocked' => true,
        ]);

        $server->forceFill([
            'external_id' => 'pod_boost_' . $user->id . '_' . time(),
            'billing_paid' => true,
        ])->save();

        $allocation->forceFill(['server_id' => $server->id])->save();

        try {
            $wings->provision($server);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('PodBoost Web Wings: ' . $e->getMessage());
        }

        $core->mode = 'pod';
        $core->allocated_server_id = $server->id;
        $core->last_reassigned_at = now();
        $core->save();

        return back()->with('success', 'Pod Booster creado y aprovisionado con exito.');
    }

    /**
     * Reinicia / libera el nucleo para transferirlo.
     */
    public function reset(Request $request)
    {
        $user = $request->user();
        $core = UserBoosterCore::where('user_id', $user->id)->first();
        if ($core) {
            $core->resetCore();
        }

        return back()->with('success', 'Nucleo Booster reiniciado. Ahora puedes transferirlo o cambiar de modo.');
    }
}
