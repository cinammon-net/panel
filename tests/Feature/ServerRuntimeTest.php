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

    public function test_files_are_listed_and_text_is_read_through_wings(): void
    {
        $server = $this->server();
        Http::fake([
            '*/files/list-directory*' => Http::response([
                ['name' => 'server.properties', 'directory' => false, 'symlink' => false, 'size' => 30],
                ['name' => 'bot-config.json', 'directory' => false, 'symlink' => false, 'size' => 70],
            ]),
            '*/files/contents*' => Http::response('server-port=25565'),
        ]);
        $this->actingAs($server->owner)->getJson('/servers/'.$server->id.'/files/list')
            ->assertOk()->assertJsonPath('data.0.name', 'server.properties')->assertJsonPath('data.1.private', true);
        $this->getJson('/servers/'.$server->id.'/files/contents?file=server.properties')
            ->assertOk()->assertJsonPath('content', 'server-port=25565');
    }

    public function test_private_paths_traversal_and_other_users_cannot_access_files(): void
    {
        $server = $this->server();
        Http::fake();
        $this->actingAs($server->owner)->getJson('/servers/'.$server->id.'/files/contents?file=bot-config.json')->assertForbidden();
        $this->getJson('/servers/'.$server->id.'/files/contents?file=.env')->assertForbidden();
        $this->getJson('/servers/'.$server->id.'/files/list?directory=../')->assertUnprocessable();
        $this->actingAs(User::factory()->create())->getJson('/servers/'.$server->id.'/files/list')->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_file_preview_rejects_large_files_and_symlink_ancestors(): void
    {
        $server = $this->server();
        Http::fake(['*/files/list-directory*' => Http::response([
            ['name' => 'server.jar', 'directory' => false, 'symlink' => false, 'size' => 50000000],
            ['name' => 'alias', 'directory' => true, 'symlink' => true, 'size' => 0],
        ])]);
        $this->actingAs($server->owner)->getJson('/servers/'.$server->id.'/files/contents?file=server.jar')->assertStatus(413);
        $this->getJson('/servers/'.$server->id.'/files/list?directory=alias/subfolder')->assertForbidden();
        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/files/contents'));
    }

    public function test_file_manager_creates_folders_and_saves_editor_contents(): void
    {
        $server = $this->server();
        Http::fake([
            '*/files/list-directory*' => Http::response([
                ['name' => 'server.properties', 'directory' => false, 'symlink' => false, 'size' => 20],
            ]),
            '*' => Http::response(null, 204),
        ]);
        $this->actingAs($server->owner)->postJson('/servers/'.$server->id.'/files/action', ['action' => 'mkdir', 'files' => [], 'name' => 'plugins-test'])->assertNoContent();
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/create-directory') && $request['name'] === 'plugins-test');
        $this->postJson('/servers/'.$server->id.'/files/write', ['file' => 'server.properties', 'content' => 'motd=Cinammon'])->assertNoContent();
        Http::assertSent(fn ($request) => str_contains($request->url(), '/files/write?') && $request->body() === 'motd=Cinammon');
        $this->postJson('/servers/'.$server->id.'/files/write', ['file' => 'server.properties', 'content' => '', 'create' => true])->assertStatus(409);
        $this->postJson('/servers/'.$server->id.'/files/write', ['file' => 'nuevo.txt', 'content' => '', 'create' => true])->assertNoContent();
    }

    public function test_file_upload_and_binary_download_are_forwarded_without_corruption(): void
    {
        $server = $this->server();
        $binary = "PK\x00\x01binary";
        $uploads = [];
        Http::fake(function ($request) use ($binary, &$uploads) {
            if (str_contains($request->url(), '/files/list-directory')) return Http::response([
                ['name' => 'archive.zip', 'directory' => false, 'symlink' => false, 'size' => strlen($binary)],
            ]);
            if (str_contains($request->url(), '/files/contents')) return Http::response($binary, 200, ['Content-Type' => 'application/octet-stream']);
            if (str_contains($request->url(), '/files/write?')) $uploads[] = $request->body();
            return Http::response(null, 204);
        });
        $this->actingAs($server->owner)->post('/servers/'.$server->id.'/files/upload', [
            'upload' => \Illuminate\Http\UploadedFile::fake()->createWithContent('upload.jar', $binary),
        ])->assertNoContent();
        $this->assertContains($binary, $uploads);
        $this->get('/servers/'.$server->id.'/files/download?file=archive.zip')->assertOk()->assertStreamedContent($binary);
    }

    public function test_file_mutations_keep_credentials_and_other_servers_protected(): void
    {
        $server = $this->server();
        Http::fake();
        $this->actingAs($server->owner)->postJson('/servers/'.$server->id.'/files/write', ['file' => 'bot-config.json', 'content' => 'x'])->assertForbidden();
        $this->postJson('/servers/'.$server->id.'/files/action', ['action' => 'delete', 'files' => ['../server.jar']])->assertUnprocessable();
        $this->postJson('/servers/'.$server->id.'/files/action', ['action' => 'rename', 'files' => ['.env'], 'name' => 'visible.txt'])->assertForbidden();
        Http::assertNothingSent();
        $this->actingAs(User::factory()->create())->postJson('/servers/'.$server->id.'/files/write', ['file' => 'file.txt', 'content' => 'x'])->assertForbidden();
        $this->postJson('/servers/'.$server->id.'/files/action', ['action' => 'delete', 'files' => ['world']])->assertForbidden();
        $this->post('/servers/'.$server->id.'/files/upload', ['upload' => \Illuminate\Http\UploadedFile::fake()->create('x.txt')])->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_nested_moves_and_archive_privacy_checks(): void
    {
        $server = $this->server();
        Http::fake(function ($request) {
            if (str_contains($request->url(), '/list-directory')) {
                return Http::response(match ($request['directory']) {
                    '/' => [['name' => 'file.txt', 'directory' => false], ['name' => 'plugins', 'directory' => true], ['name' => 'private', 'directory' => true]],
                    '/plugins' => [['name' => 'nested', 'directory' => true]],
                    '/private' => [['name' => '.env', 'directory' => false]],
                    default => [],
                });
            }
            return Http::response(null, 204);
        });
        $this->actingAs($server->owner)->postJson('/servers/'.$server->id.'/files/action', ['action' => 'move', 'files' => ['file.txt'], 'destination' => 'plugins/nested', 'name' => 'plugins/nested'])->assertNoContent();
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/rename') && $request['files'][0]['to'] === 'plugins/nested/file.txt');
        $this->postJson('/servers/'.$server->id.'/files/action', ['action' => 'compress', 'files' => ['private']])->assertForbidden();
        Http::assertNotSent(fn ($request) => str_ends_with($request->url(), '/compress'));
    }

}
