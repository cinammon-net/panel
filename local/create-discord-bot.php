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
if (!app()->environment('local') || config('app.url') !== 'http://localhost:8000') throw new RuntimeException('Local use only.');
$node = Node::where('name', 'Local Linux')->firstOrFail();
$existing = Server::where('node_id', $node->id)->where('name', 'Cinammon Discord Bot')->first();
if ($existing) {
    echo "Server already exists. Console: http://localhost:8000/servers/{$existing->id}/console\n";
    exit;
}
$script = <<<'SH'
#!/bin/sh
set -eu
cd /mnt/server
for item in package.json package-lock.json src node_modules; do
    if [ ! -e "$item" ]; then cp -R "/opt/bot/$item" .; fi
done
if [ ! -f bot-config.json ]; then
    printf '{"token":"","guild_id":""}\n' > bot-config.json
    chmod 0600 bot-config.json
fi
cat > README.txt <<'TXT'
Cinammon Discord Bot
Usa la consola del panel para guardar el token y el ID del servidor de Discord.
No pegues el token en el chat ni en la consola.
Comandos de consola: status, test, stop.
Comandos de Discord: /ping, /ayuda, /estado.
Sin token, el proceso queda en espera. Eso no significa que esté conectado a Discord.
TXT
SH;
$server = DB::transaction(function () use ($node, $script) {
    $egg = Egg::firstOrCreate(['name' => 'Node.js 24'], [
        'uuid' => (string) Str::uuid(), 'author' => 'admin@cinammon.local', 'category' => 'discord',
        'description' => 'Cinammon Discord bot, Node.js 24. Private token configuration.',
        'startup' => 'node src/index.js', 'config_stop' => 'stop',
        'config_startup' => json_encode(['done' => 'BOT_HOST_READY']),
        'config_files' => '{}', 'features' => '[]', 'file_denylist' => '[]',
        'docker_images' => json_encode(['Node.js 24 (Local)' => 'cinammon-discord-bot:node24']),
        'script_install' => $script, 'script_container' => 'cinammon-discord-bot:node24', 'script_entry' => 'sh',
    ]);
    $allocation = Allocation::firstOrCreate(['node_id' => $node->id, 'ip' => '127.0.0.1', 'port' => 3001]);
    if ($allocation->server_id || Server::where('allocation_id', $allocation->id)->exists()) throw new RuntimeException('Allocation already assigned.');
    $uuid = (string) Str::uuid();
    $server = Server::create([
        'uuid' => $uuid, 'uuid_short' => substr($uuid, 0, 8), 'name' => 'Cinammon Discord Bot',
        'node_id' => $node->id, 'owner_id' => User::where('email', 'admin@cinammon.local')->firstOrFail()->id,
        'egg_id' => $egg->id, 'allocation_id' => $allocation->id, 'active' => true, 'status' => false,
        'memory' => 512, 'swap' => 0, 'disk' => 1024, 'cpu' => 50, 'io' => 500,
        'image' => 'cinammon-discord-bot:node24', 'startup' => $egg->startup,
        'run_install_script' => true, 'start_after_install' => true,
        'description' => 'Discord bot hosting. Requires a private Discord bot token to connect.',
    ]);
    $allocation->forceFill(['server_id' => $server->id])->save();
    return $server;
});
app(WingsClient::class)->provision($server);
echo "Created {$server->name}. Console: http://localhost:8000/servers/{$server->id}/console\n";
