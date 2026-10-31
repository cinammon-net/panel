#!/bin/bash
set -e
echo "Sincronizando archivos del bot con Wings..."
./local/dev php sync_server2.php
