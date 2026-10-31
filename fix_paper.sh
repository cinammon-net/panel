#!/bin/bash
set -e
echo "Descargando e instalando server.jar en el servidor de Minecraft..."
./local/dev php install_paper.php
echo "Reiniciando servidor de Minecraft..."
./local/dev php -r '$s = App\Models\Server::where("startup", "like", "%server.jar%")->first(); if ($s) { app(App\Services\Daemon\WingsClient::class)->forServer($s)->post("/servers/".$s->uuid."/power", ["action" => "restart"]); echo "✔ Servidor Minecraft reiniciado correctamente.\n"; }'
