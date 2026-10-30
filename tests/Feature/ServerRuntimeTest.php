<?php

namespace Tests\Feature;

use App\Models\Allocation;
use App\Models\Egg;
use App\Models\Node;
use App\Models\Server;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class ServerRuntimeTest extends TestCase
{
    use RefreshDatabase;

    private function server(): Server
    {
        $owner = User::factory()->create();
        $node = Node::create(['name' => 'Local', 'fqdn' => '127.0.0.1', 'scheme' => 'http', 'daemon_listen' => 8080,
            'uuid' => (string) Str::uuid(), 'daemon_token_id' => 'node-id', 'daemon_token' => 'node-secret']);
        $egg = Egg::create(['name' => 'Paper', 'uuid' => (string) Str::uuid(), 'author' => 'test@example.com',
            'config_startup' => '{"done":"Done"}', 'config_stop' => 'stop', 'config_files' => '{}',
            'script_container' => 'alpine', 'script_entry' => 'sh', 'script_install' => 'exit 0']);
        $allocation = Allocation::create(['node_id' => $node->id, 'ip' => '0.0.0.0', 'port' => 25565]);
        $uuid = (string) Str::uuid();
        $server = Server::create(['uuid' => $uuid, 'uuid_short' => substr($uuid, 0, 8), 'name' => 'Test Paper',
            'node_id' => $node->id, 'egg_id' => $egg->id, 'allocation_id' => $allocation->id,
            'owner_id' => $owner->id, 'active' => true, 'status' => false, 'startup' => 'java -jar server.jar',
            'image' => 'local-java', 'memory' => 2048, 'run_install_script' => true]);
        $server->forceFill(['installed_at' => now()])->save();
        return $server;
    }

    public function test_node_can_load_its_servers_but_cannot_read_another_nodes_server(): void
    {
        $server = $this->server();
        $this->withToken('node-id.node-secret')->getJson('/api/remote/servers')
            ->assertOk()->assertJsonPath('data.0.settings.uuid', $server->uuid)
            ->assertJsonPath('data.0.settings.container.image', 'local-java')
            ->assertJsonPath('data.0.settings.allocations.default.port', 25565);
        $this->withToken('node-id.node-secret')->getJson('/api/remote/servers/'.$server->uuid)->assertOk();
        $other = Node::create(['name' => 'Other', 'fqdn' => 'other.test', 'uuid' => (string) Str::uuid(), 'daemon_token_id' => 'other', 'daemon_token' => 'other-secret']);
        $this->withToken('other.other-secret')->getJson('/api/remote/servers/'.$server->uuid)->assertNotFound();
        $this->withToken('other.other-secret')->postJson('/api/remote/servers/'.$server->uuid.'/install', ['successful' => true])->assertNotFound();
    }

    public function test_console_forwards_commands_and_power_without_exposing_node_credentials(): void
    {
        $server = $this->server();
        Http::fake([
            '*/logs*' => Http::response(['data' => ["\033[32mDone\033[0m"]]),
            '*/files/contents*' => Http::response("eula=true\n"),
            '*/commands' => Http::response(null, 204),
            '*/power' => Http::response(null, 202),
            '*' => Http::response(['state' => 'running', 'utilization' => []]),
        ]);
        $this->actingAs($server->owner)->getJson('/servers/'.$server->id.'/runtime')
            ->assertOk()->assertJsonPath('state', 'running')->assertJsonPath('logs', 'Done')
            ->assertJsonPath('eula_accepted', true)->assertDontSee('node-secret');
        $this->postJson('/servers/'.$server->id.'/command', ['command' => 'list'])->assertNoContent();
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/commands')
            && $request['commands'] === ['list'] && $request->hasHeader('Authorization', 'Bearer node-secret'));
        $this->postJson('/servers/'.$server->id.'/power', ['action' => 'restart'])->assertStatus(202);
        $this->postJson('/servers/'.$server->id.'/power', ['action' => 'invalid'])->assertUnprocessable();
    }

    public function test_unrelated_user_cannot_read_logs_or_control_a_server(): void
    {
        $server = $this->server();
        $other = User::factory()->create();
        Http::fake();
        $this->actingAs($other)->getJson('/servers/'.$server->id.'/runtime')->assertForbidden();
        $this->postJson('/servers/'.$server->id.'/command', ['command' => 'stop'])->assertForbidden();
        $this->postJson('/servers/'.$server->id.'/power', ['action' => 'start'])->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_minecraft_eula_is_only_written_after_explicit_acceptance(): void
    {
        $server = $this->server();
        Http::fake(['*' => Http::response(null, 204)]);
        $this->actingAs($server->owner)->postJson('/servers/'.$server->id.'/eula', ['accepted' => false])->assertUnprocessable();
        Http::assertNothingSent();
        $this->postJson('/servers/'.$server->id.'/eula', ['accepted' => true])->assertNoContent();
        Http::assertSent(fn ($request) => $request->body() === "eula=true\n"
            && str_contains($request->url(), '/files/write?file=eula.txt'));
    }
    public function test_discord_configuration_stays_private_and_restarts_the_bot(): void
    {
        $server = $this->server();
        $server->egg->update(['category' => 'discord']);
        $token = str_repeat('private-bot-token-', 3);
        Http::fake(['*' => Http::response(null, 204)]);
        $this->actingAs($server->owner)->postJson('/servers/'.$server->id.'/discord', ['password' => $token, 'guild_id' => '123456789012345678'])
            ->assertOk()->assertDontSee($token);
        Http::assertSent(fn ($request) => str_contains($request->url(), '/files/write?file=bot-config.json')
            && json_decode($request->body(), true)['token'] === $token);
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/power') && $request['action'] === 'restart');
        $other = User::factory()->create();
        $this->actingAs($other)->postJson('/servers/'.$server->id.'/discord', ['password' => $token])->assertForbidden();
    }

    public function test_discord_status_does_not_expose_secrets_or_stale_connection_state(): void
    {
        $server = $this->server();
        $server->egg->update(['category' => 'discord']);
        Http::fake([
            '*/logs*' => Http::response(['data' => ['BOT_HOST_READY']]),
            '*/files/contents*' => Http::response([
                'connected' => true, 'configured' => true, 'token' => 'must-not-leak',
                'updated_at' => now()->subMinute()->toIso8601String(), 'tag' => 'Cinammon',
            ]),
            '*' => Http::response(['state' => 'running']),
        ]);
        $this->actingAs($server->owner)->getJson('/servers/'.$server->id.'/runtime')
            ->assertOk()->assertJsonPath('bot_status.connected', false)
            ->assertJsonPath('bot_status.configured', true)->assertDontSee('must-not-leak');
    }

}
