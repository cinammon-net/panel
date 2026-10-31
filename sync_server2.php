<?php
use App\Models\Server;
use App\Services\Daemon\WingsClient;

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$server = Server::find(2);
if (!$server) {
    echo "Servidor 2 no encontrado.\n";
    exit(1);
}

$client = app(WingsClient::class)->forServer($server);

$directories = ['components', 'commands', 'handlers', 'api'];
foreach ($directories as $d) {
    try {
        $client->post("/servers/{$server->uuid}/files/create-directory", [
            'path' => '/src',
            'name' => $d,
        ]);
        echo "Directorio creado o existente: /src/$d\n";
    } catch (\Throwable $e) {
        echo "Info dir $d: " . $e->getMessage() . "\n";
    }
}

$map = [
    '/src/index.js' => base_path('storage/app/servers/'.$server->uuid.'/src/index.js'),
    '/src/components/v2.js' => base_path('storage/app/servers/'.$server->uuid.'/src/components/v2.js'),
    '/src/commands/registry.js' => base_path('storage/app/servers/'.$server->uuid.'/src/commands/registry.js'),
    '/src/handlers/interactions.js' => base_path('storage/app/servers/'.$server->uuid.'/src/handlers/interactions.js'),
    '/src/api/panel.js' => base_path('storage/app/servers/'.$server->uuid.'/src/api/panel.js'),
    '/package.json' => base_path('storage/app/servers/'.$server->uuid.'/package.json'),
    '/README.md' => base_path('storage/app/servers/'.$server->uuid.'/README.md'),
];

foreach ($map as $dest => $srcFile) {
    if (file_exists($srcFile)) {
        try {
            $client->withBody(file_get_contents($srcFile), 'application/octet-stream')
                ->post("/servers/{$server->uuid}/files/write?file=" . urlencode($dest));
            echo "✔ Subido con éxito: $dest\n";
        } catch (\Throwable $e) {
            echo "❌ Error subiendo $dest: " . $e->getMessage() . "\n";
        }
    } else {
        echo "Archivo local no encontrado: $srcFile\n";
    }
}
echo "\n✨ Todo sincronizado correctamente en Wings /home/container.\n";
