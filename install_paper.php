<?php
use App\Models\Server;
use App\Services\Daemon\WingsClient;

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$servers = Server::where('startup', 'like', '%server.jar%')
    ->orWhere('startup', 'like', '%{{SERVER_JARFILE}}%')
    ->get();

$build = json_decode(file_get_contents(__DIR__.'/local/paper/build.json'), true, 512, JSON_THROW_ON_ERROR);
$url = $build['downloads']['server:default']['url'];

echo "Descargando PaperMC stable jar...\n";
$tempJar = '/tmp/paper_server.jar';
if (!file_exists($tempJar) || filesize($tempJar) < 10000000) {
    file_put_contents($tempJar, fopen($url, 'r'));
    echo "Descargado (" . round(filesize($tempJar) / 1048576, 2) . " MB).\n";
}

foreach ($servers as $s) {
    echo "Instalando en servidor #{$s->id} ({$s->name} / {$s->uuid})...\n";
    try {
        $client = app(WingsClient::class)->forServer($s);
        // Escribir eula=true
        $client->withBody("eula=true\n", 'text/plain')
            ->post("/servers/{$s->uuid}/files/write?file=" . urlencode('/eula.txt'));
        
        // Escribir server.jar
        $client->withBody(file_get_contents($tempJar), 'application/octet-stream')
            ->post("/servers/{$s->uuid}/files/write?file=" . urlencode('/server.jar'));
        
        echo "✔ server.jar y eula.txt subidos correctamente a #{$s->id}.\n";
    } catch (\Throwable $e) {
        echo "Aviso Wings para #{$s->id}: " . $e->getMessage() . "\n";
    }
}
echo "Proceso finalizado.\n";
