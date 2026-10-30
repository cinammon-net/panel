<?php

use App\Models\Server;
use App\Services\Daemon\WingsClient;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (!app()->environment('local')) throw new RuntimeException('Local use only.');
$server = Server::where('name', 'Cinammon Discord Bot')->firstOrFail();
$client = app(WingsClient::class)->forServer($server);
$path = '/servers/'.$server->uuid;
switch ($argv[1] ?? 'status') {
    case 'set-guild':
        $guild = $argv[2] ?? '';
        if (!preg_match('/^[0-9]{17,22}$/', $guild)) throw new RuntimeException('Invalid guild ID.');
        $config = $client->get($path.'/files/contents', ['file' => 'bot-config.json'])->throw()->json();
        $config['guild_id'] = $guild;
        app(WingsClient::class)->forServer($server)->withBody(json_encode($config, JSON_THROW_ON_ERROR), 'application/json')
            ->post($path.'/files/write?file=bot-config.json')->throw();
        app(WingsClient::class)->forServer($server)->post($path.'/power', ['action' => 'restart'])->throw();
        echo "Test server configured. Bot restarting. No credentials displayed.\n";
        break;
    case 'test':
        $client->post($path.'/commands', ['commands' => ['test']])->throw();
        echo "Local self-test requested in the running bot process.\n";
        break;
    case 'logs':
        echo implode("\n", $client->get($path.'/logs')->throw()->json('data') ?? [])."\n";
        break;
    default:
        $state = $client->get($path)->throw()->json();
        $server->update(['status' => ($state['state'] ?? '') === 'running']);
        $status = $client->get($path.'/files/contents', ['file' => 'bot-status.json']);
        echo json_encode(['name' => $server->name, 'state' => $state['state'],
            'installed' => (bool) $server->installed_at, 'discord' => $status->successful() ? $status->json() : null], JSON_PRETTY_PRINT)."\n";
}
