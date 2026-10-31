#!/bin/bash
repo="$(pwd)"
lima="$repo/../.local-runtime/lima/bin/limactl"
vm="cinammon-local"
UUID="6259012b-d096-4c29-a26f-8515e5afd4d3"

echo "Verificando Lima VM..."
if [ -x "$lima" ]; then
    echo "Lima encontrado. Verificando estado de la VM..."
    "$lima" list "$vm" || true
    echo "Copiando archivos directamente al volumen del servidor en la VM..."
    "$lima" shell "$vm" -- sudo mkdir -p /var/lib/cinammon/volumes/${UUID}/src/components
    "$lima" shell "$vm" -- sudo mkdir -p /var/lib/cinammon/volumes/${UUID}/src/commands
    "$lima" shell "$vm" -- sudo mkdir -p /var/lib/cinammon/volumes/${UUID}/src/handlers
    "$lima" shell "$vm" -- sudo mkdir -p /var/lib/cinammon/volumes/${UUID}/src/api

    echo "Copiando desde el host hacia la VM..."
    "$lima" copy storage/app/servers/${UUID}/src/index.js "$vm":/tmp/index.js
    "$lima" shell "$vm" -- sudo cp /tmp/index.js /var/lib/cinammon/volumes/${UUID}/src/index.js

    "$lima" copy storage/app/servers/${UUID}/src/components/v2.js "$vm":/tmp/v2.js
    "$lima" shell "$vm" -- sudo cp /tmp/v2.js /var/lib/cinammon/volumes/${UUID}/src/components/v2.js

    "$lima" copy storage/app/servers/${UUID}/src/commands/registry.js "$vm":/tmp/registry.js
    "$lima" shell "$vm" -- sudo cp /tmp/registry.js /var/lib/cinammon/volumes/${UUID}/src/commands/registry.js

    "$lima" copy storage/app/servers/${UUID}/src/handlers/interactions.js "$vm":/tmp/interactions.js
    "$lima" shell "$vm" -- sudo cp /tmp/interactions.js /var/lib/cinammon/volumes/${UUID}/src/handlers/interactions.js

    "$lima" copy storage/app/servers/${UUID}/src/api/panel.js "$vm":/tmp/panel.js
    "$lima" shell "$vm" -- sudo cp /tmp/panel.js /var/lib/cinammon/volumes/${UUID}/src/api/panel.js

    echo "Ajustando permisos..."
    "$lima" shell "$vm" -- sudo chown -R 1000:1000 /var/lib/cinammon/volumes/${UUID}/src
    echo "✅ Copiado directamente al volumen del contenedor en la VM."
else
    echo "Lima limactl no encontrado en $lima."
fi
