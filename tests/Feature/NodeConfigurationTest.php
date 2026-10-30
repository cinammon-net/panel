<?php

namespace Tests\Feature;

use App\Http\Controllers\NodeController;
use App\Models\Node;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\Yaml\Yaml;
use Tests\TestCase;

class NodeConfigurationTest extends TestCase
{
    use RefreshDatabase;

    public function test_configuration_uses_panel_url_and_saved_node_settings(): void
    {
        config(['app.url' => 'https://panel.example.com/']);
        $node = Node::create([
            'name' => 'Test', 'fqdn' => 'node.example.com',
            'uuid' => 'd0955d1d-99de-47af-a397-a3af2865bd53',
            'daemon_token_id' => 'test-id', 'daemon_token' => 'test-token',
            'scheme' => 'http', 'daemon_listen' => 9090,
            'daemon_sftp' => 2222, 'upload_size' => 512,
        ])->fresh();

        $response = (new NodeController)->configYaml($node->id);
        $config = Yaml::parse($response->getContent());

        $this->assertSame('https://panel.example.com', $config['remote']);
        $this->assertSame(9090, $config['api']['port']);
        $this->assertFalse($config['api']['ssl']['enabled']);
        $this->assertSame(512, $config['api']['upload_limit']);
        $this->assertSame(2222, $config['system']['sftp']['bind_port']);
        $this->assertSame('test-token', $config['token']);
        $this->assertStringContainsString('allowed_mounts: []', $response->getContent());

        foreach (['https' => true, 'https-reverse' => false] as $scheme => $enabled) {
            $node->update(['scheme' => $scheme]);
            $config = Yaml::parse((new NodeController)->configYaml($node->id)->getContent());
            $this->assertSame($enabled, $config['api']['ssl']['enabled']);
        }
    }

    public function test_configuration_download_requires_login(): void
    {
        foreach (['/nodes/1/config-yaml', '/api/nodes/1/config-yaml', '/api/application/nodes/1/configuration'] as $url) {
            $this->getJson($url)->assertUnauthorized();
        }
    }
    public function test_daemon_authentication_and_empty_node_boot_protocol(): void
    {
        $node = Node::create([
            'name' => 'Test', 'fqdn' => '127.0.0.1',
            'uuid' => 'd0955d1d-99de-47af-a397-a3af2865bd53',
            'daemon_token_id' => 'test-id', 'daemon_token' => 'test-token',
        ]);
        $this->getJson('/api/remote/servers')->assertUnauthorized();
        $this->withToken('test-id.wrong')->getJson('/api/remote/servers')->assertUnauthorized();
        $this->withToken('test-id.test-token')->getJson('/api/remote/servers')
            ->assertOk()->assertJsonPath('data', [])->assertJsonPath('meta.total', 0);
        $this->withToken('test-id.test-token')->postJson('/api/remote/servers/reset')->assertNoContent();
        $this->withToken('test-id.test-token')->postJson('/api/remote/activity', ['data' => []])->assertNoContent();
    }

    public function test_status_check_uses_the_configured_port_and_authentication(): void
    {
        $node = Node::create([
            'name' => 'Test', 'fqdn' => '127.0.0.1', 'scheme' => 'http', 'daemon_listen' => 9090,
            'uuid' => 'd0955d1d-99de-47af-a397-a3af2865bd53',
            'daemon_token_id' => 'test-id', 'daemon_token' => 'test-token',
        ]);
        \Illuminate\Support\Facades\Http::fake([
            'http://127.0.0.1:9090/api/system' => \Illuminate\Support\Facades\Http::sequence()->push(['version' => 'local'], 200)->push([], 403),
        ]);
        $this->artisan('nodes:check-status')->assertSuccessful();
        $this->assertTrue((bool) $node->fresh()->online);
        \Illuminate\Support\Facades\Http::assertSent(fn ($request) =>
            $request->url() === 'http://127.0.0.1:9090/api/system'
            && $request->hasHeader('Authorization', 'Bearer test-token')
        );
        $this->artisan('nodes:check-status')->assertSuccessful();
        $this->assertFalse((bool) $node->fresh()->online);
    }

}
