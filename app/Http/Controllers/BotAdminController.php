<?php

namespace App\Http\Controllers;

use App\Models\Allocation;
use App\Models\Egg;
use App\Models\Node;
use App\Models\Server;
use App\Models\User;
use App\Services\Daemon\WingsClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Administración desde Discord (solo Owner y Admin del panel, por la cuenta vinculada):
 * crear servidores y nodos, mantenimiento de nodos y suspender, reactivar o borrar servidores.
 */
class BotAdminController extends Controller
{
    public function eggs(Request $request, string $discordId)
    {
        $this->admin($discordId);
        $q = trim((string) $request->query('q', ''));

        return response()->json([
            'eggs' => Egg::query()
                ->when($q !== '', fn ($w) => $w->where('name', 'like', '%'.str_replace(['%', '_'], ['\%', '\_'], $q).'%'))
                ->orderBy('name')->limit(25)->get(['id', 'name', 'category']),
        ]);
    }

    public function nodes(string $discordId)
    {
        $this->admin($discordId);

        return response()->json([
            'nodes' => Node::orderBy('id')->get()->map(fn (Node $n) => [
                'id' => $n->id,
                'name' => $n->name,
                'fqdn' => $n->fqdn,
                'online' => (bool) $n->online,
                'maintenance' => (bool) $n->maintenance_mode,
                'servers' => Server::where('node_id', $n->id)->count(),
                'memory' => $n->memory,
                'disk' => $n->disk,
                'url' => url('/nodes/'.$n->id.'/edit'),
            ]),
        ]);
    }

    public function createNode(Request $request, string $discordId)
    {
        $this->admin($discordId);
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'fqdn' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9.-]+$/i'],
            'daemon_listen' => 'nullable|integer|min:1|max:65535',
            'scheme' => 'nullable|in:http,https,https-reverse',
            'sftp_port' => 'nullable|integer|min:1|max:65535',
            'memory' => 'nullable|integer|min:0',
            'disk' => 'nullable|integer|min:0',
        ]);

        $node = Node::create([
            'name' => $data['name'],
            'fqdn' => strtolower($data['fqdn']),
            'daemon_listen' => $data['daemon_listen'] ?? 8080,
            'scheme' => $data['scheme'] ?? 'https',
            'maintenance_mode' => false,
            'deployments' => true,
            'upload_size' => 100,
            'daemon_sftp' => $data['sftp_port'] ?? 2022,
            'daemon_sftp_alias' => '',
            'tags' => '',
            'memory' => $data['memory'] ?? null,
            'disk' => $data['disk'] ?? null,
            'cpu' => null,
            'uuid' => (string) Str::uuid(),
            'daemon_token_id' => (string) Str::uuid(),
            'daemon_token' => Str::random(64),
        ]);

        return response()->json(['node' => ['id' => $node->id, 'name' => $node->name, 'fqdn' => $node->fqdn, 'url' => url('/nodes/'.$node->id.'/edit')]], 201);
    }

    public function nodeMaintenance(Request $request, string $discordId, Node $node)
    {
        $this->admin($discordId);
        $node->update(['maintenance_mode' => $request->boolean('on')]);

        return response()->json(['node' => ['id' => $node->id, 'maintenance' => (bool) $node->maintenance_mode]]);
    }

    /** Crea un servidor (misma lógica que los pedidos de la tienda). */
    public function createServer(Request $request, string $discordId, WingsClient $wings)
    {
        $admin = $this->admin($discordId);
        $data = $request->validate([
            'name' => 'required|string|max:60',
            'egg_id' => 'required|integer|exists:eggs,id',
            'memory' => 'required|integer|min:128|max:262144',
            'disk' => 'required|integer|min:512|max:2097152',
            'cpu' => 'required|integer|min:25|max:3200',
            'node_id' => 'nullable|integer|exists:nodes,id',
            'owner_discord_id' => 'nullable|string|max:32',
            'owner_email' => 'nullable|email',
        ]);

        $owner = $admin;
        if (! empty($data['owner_discord_id'])) {
            $owner = User::where('discord_id', $data['owner_discord_id'])->first();
            abort_unless($owner, 422, 'Esa persona no tiene su Discord vinculado con el panel.');
        } elseif (! empty($data['owner_email'])) {
            $owner = User::whereRaw('LOWER(email) = ?', [strtolower($data['owner_email'])])->first();
            abort_unless($owner, 422, 'No hay ninguna cuenta con ese correo.');
        }

        $egg = Egg::findOrFail($data['egg_id']);
        $node = ! empty($data['node_id']) ? Node::findOrFail($data['node_id']) : Node::where('maintenance_mode', false)->orderBy('id')->firstOrFail();

        $allocation = Allocation::whereNull('server_id')
            ->where('node_id', $node->id)
            ->whereNotIn('id', Server::whereNotNull('allocation_id')->pluck('allocation_id'))
            ->orderBy('port')
            ->first();
        if (! $allocation) {
            $allocation = Allocation::create([
                'node_id' => $node->id,
                'ip' => Allocation::where('node_id', $node->id)->value('ip') ?? '0.0.0.0',
                'port' => max(25565, (int) Allocation::where('node_id', $node->id)->max('port') + 1),
            ]);
        }

        $images = json_decode($egg->docker_images ?? '{}', true) ?: [];
        $server = Server::create([
            'uuid' => (string) Str::uuid(),
            'uuid_short' => substr((string) Str::uuid(), 0, 8),
            'node_id' => $node->id,
            'allocation_id' => $allocation->id,
            'name' => $data['name'],
            'active' => 1,
            'owner_id' => $owner->id,
            'memory' => $data['memory'],
            'swap' => 0,
            'disk' => $data['disk'],
            'io' => 500,
            'cpu' => $data['cpu'],
            'egg_id' => $egg->id,
            'startup' => $egg->startup ?? '',
            'image' => reset($images) ?: '',
            'status' => 0,
        ]);
        $allocation->forceFill(['server_id' => $server->id])->save();

        try {
            $wings->provision($server);
        } catch (\Throwable $e) {
            Log::warning('Bot: no se pudo aprovisionar en Wings: '.$e->getMessage());
        }
        \App\Support\Ranks::sync($owner);

        return response()->json(['server' => [
            'id' => $server->id,
            'name' => $server->name,
            'egg' => $egg->name,
            'node' => $node->name,
            'owner' => $owner->name,
            'owner_discord_id' => $owner->discord_id,
            'address' => $server->fresh()->publicAddress(),
            'url' => url('/servers/'.$server->id.'/console'),
        ]], 201);
    }

    public function serverAction(Request $request, string $discordId, Server $server, WingsClient $wings)
    {
        $this->admin($discordId);
        $action = $request->validate(['action' => 'required|in:suspend,unsuspend,delete'])['action'];

        if ($action === 'delete') {
            $name = $server->name;
            $server->delete();

            return response()->json(['deleted' => $name]);
        }

        if ($action === 'suspend') {
            $server->forceFill(['active' => 0, 'status' => 0])->save();
            try {
                $wings->power($server, 'kill');
            } catch (\Throwable) {
            }
        } else {
            $server->forceFill(['active' => 1])->save();
        }
        if ($server->owner) {
            \App\Support\Ranks::sync($server->owner);
        }

        return response()->json(['server' => ['id' => $server->id, 'name' => $server->name, 'active' => (int) $server->active]]);
    }

    private function admin(string $discordId): User
    {
        $user = User::where('discord_id', $discordId)->first();
        abort_unless($user, 404, 'not_linked');
        abort_unless($user->hasAnyRole(['Owner', 'Admin']), 403, 'Solo Owner y Admin.');

        return $user;
    }
}
