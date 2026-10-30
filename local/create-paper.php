<?php

use App\Models\Allocation;
use App\Models\Egg;
use App\Models\Node;
use App\Models\Server;
use App\Models\User;
use App\Services\Daemon\WingsClient;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (!app()->environment('local') || config('app.url') !== 'http://localhost:8000') {
    throw new RuntimeException('Restricted to the local panel.');
}
$node = Node::where('name', 'Local Linux')->firstOrFail();
$existing = Server::where('node_id', $node->id)->where('name', 'Minecraft Paper Local')->first();
if ($existing) {
    echo "Server already exists: {$existing->uuid}. No files changed.\n";
    exit;
}
$build = json_decode(file_get_contents(__DIR__.'/paper/build.json'), true, 512, JSON_THROW_ON_ERROR);
$download = $build['downloads']['server:default'];
$script = <<<'SH'
#!/bin/sh
set -eu
apk add --no-cache curl
cd /mnt/server
curl -fL --retry 3 -A 'cinammon-local/1.0 (https://github.com/cinammon-net/panel)' '__URL__' -o server.jar.download
echo '__SHA256__  server.jar.download' | sha256sum -c -
mv server.jar.download server.jar
if [ ! -f server.properties ]; then
cat > server.properties <<'PROPS'
server-ip=0.0.0.0
server-port=25565
motd=Cinammon - Minecraft Paper Local
max-players=10
online-mode=true
view-distance=6
simulation-distance=4
spawn-protection=16
PROPS
fi
if [ ! -f eula.txt ]; then
  printf 'eula=false\n' > eula.txt
fi
SH;
$script = str_replace(['__URL__', '__SHA256__'], [$download['url'], $download['checksums']['sha256']], $script);
$server = DB::transaction(function () use ($node, $script) {
    $egg = Egg::firstOrCreate(['name' => 'Paper (Local)'], [
        'uuid' => (string) Str::uuid(), 'author' => 'admin@cinammon.local',
        'description' => 'Paper 26.3, pinned stable build. Local testing.',
        'category' => 'minecraft',
        'startup' => 'java -Xms256M -Xmx1536M -jar server.jar --nogui',
        'config_stop' => 'stop', 'config_startup' => json_encode(['done' => ')! For help, type']),
        'config_files' => '{}', 'file_denylist' => '[]', 'features' => '[]',
        'docker_images' => json_encode(['Java 25 (Local)' => 'cinammon-paper:java25']),
        'script_install' => $script, 'script_container' => 'alpine:3.22', 'script_entry' => 'sh',
    ]);
    $allocation = Allocation::firstOrCreate(['node_id' => $node->id, 'ip' => '0.0.0.0', 'port' => 25565]);
    if ($allocation->server_id || Server::where('allocation_id', $allocation->id)->exists()) {
        throw new RuntimeException('Port 25565 is already allocated.');
    }
    $uuid = (string) Str::uuid();
    $server = Server::create([
        'uuid' => $uuid, 'uuid_short' => substr($uuid, 0, 8),
        'name' => 'Minecraft Paper Local', 'node_id' => $node->id,
        'owner_id' => User::where('email', 'admin@cinammon.local')->firstOrFail()->id,
        'allocation_id' => $allocation->id, 'egg_id' => $egg->id,
        'active' => true, 'status' => false, 'memory' => 2048, 'swap' => 0,
        'disk' => 5120, 'io' => 500, 'cpu' => 200,
        'image' => 'cinammon-paper:java25', 'startup' => $egg->startup,
        'run_install_script' => true, 'start_after_install' => false,
        'description' => 'Paper 26.3 local server on localhost:25565',
    ]);
    $allocation->forceFill(['server_id' => $server->id])->save();
    return $server;
});
app(WingsClient::class)->provision($server);
echo "Created {$server->name}\nUUID: {$server->uuid}\nConsole: http://localhost:8000/servers/{$server->id}/console\n";
