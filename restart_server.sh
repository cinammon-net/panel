#!/bin/bash
set -e
echo "Reiniciando servidor de bot en Wings..."
./local/dev php -r '$s = App\Models\Server::find(2); app(App\Services\Daemon\WingsClient::class)->forServer($s)->post("/servers/".$s->uuid."/power", ["action" => "restart"]); echo "✔ Señal de reinicio enviada a Wings con éxito.\n";'
