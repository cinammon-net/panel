#!/bin/bash
set -e
repo=$(cd "$(dirname "$0")" && pwd)
lima="$repo/../.local-runtime/lima/bin/limactl"
vm="cinammon-local"
echo "Reiniciando servicios en la máquina local (Wings + Panel)..."
"$lima" shell "$vm" -- sudo systemctl restart cinammon-wings
echo "✔ Wings reiniciado correctamente."
