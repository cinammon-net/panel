<?php

use App\Models\Server;
use App\Services\Daemon\WingsClient;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (!app()->environment('local')) throw new RuntimeException('Local use only.');
$server = Server::where('name', 'Minecraft Paper Local')->firstOrFail();
$client = app(WingsClient::class)->forServer($server);
$path = '/servers/'.$server->uuid;
switch ($argv[1] ?? 'status') {
    case 'accept-eula':
        $client->withBody("eula=true\n", 'text/plain')->post($path.'/files/write?file=eula.txt')->throw();
        echo "EULA acceptance saved.\n";
        break;
    case 'start':
    case 'stop':
    case 'restart':
        $client->post($path.'/power', ['action' => $argv[1]])->throw();
        echo "Power action sent: {$argv[1]}\n";
        break;
    case 'logs':
        echo implode("\n", ($client->get($path.'/logs', ['size' => 100])->throw()->json('data') ?? []))."\n";
        break;
    default:
        $state = $client->get($path)->throw()->json();
        $server->update(['status' => $state['state'] === 'running']);
        echo json_encode(['name' => $server->name, 'state' => $state['state'], 'installed' => (bool) $server->installed_at], JSON_PRETTY_PRINT)."\n";
}
