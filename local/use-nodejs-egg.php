<?php

use App\Models\Server;
use App\Services\Daemon\WingsClient;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (!app()->environment('local')) throw new RuntimeException('Local use only.');
$server = Server::where('name', 'Cinammon Discord Bot')->firstOrFail();
$egg = $server->egg;
$egg->update([
    'name' => 'Node.js 24',
    'description' => 'Node.js 24 hosting. Application files are editable in /home/container.',
    'startup' => 'node src/index.js',
]);
$server->update(['startup' => 'node src/index.js']);
$client = app(WingsClient::class)->forServer($server->fresh());
$client->post('/servers/'.$server->uuid.'/sync')->throw();
$client->post('/servers/'.$server->uuid.'/power', ['action' => 'restart'])->throw();
echo "Egg: Node.js 24; startup: node src/index.js. Restart requested.\n";
