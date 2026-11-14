#!/usr/bin/env bash
# ==============================================================================
# Cinammon Panel Installer
# https://cinammon.net | https://docs.cinammon.net
# ==============================================================================
set -euo pipefail

echo ""
echo "  ✦ CINAMMON PANEL INSTALLER ✦"
echo "  Desplegando el paquete oficial pre-construido..."
echo ""

if [ "$(id -u)" -ne 0 ]; then
    echo "Error: este script debe ejecutarse con permisos de superusuario (root)."
    echo "Ejecuta: curl -sSL https://docs.cinammon.net/install.sh | sudo bash"
    exit 1
fi

for cmd in curl tar; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "Error: falta la utilidad '$cmd'. Instálala con 'apt-get install -y $cmd'."
        exit 1
    fi
done

INSTALL_DIR="/var/www/cinammon-panel"
RELEASE_URL="https://github.com/cinammon-net/panel/releases/latest/download/panel.tar.gz"

echo "-> [1/4] Creando directorio en $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo "-> [2/4] Descargando paquete oficial (panel.tar.gz)..."
curl -sSL -o panel.tar.gz "$RELEASE_URL"

echo "-> [3/4] Extrayendo archivos de producción..."
tar -xzf panel.tar.gz
rm -f panel.tar.gz

echo "-> [4/4] Configurando entorno y base de datos..."
if [ ! -f .env ]; then
    cp .env.example .env
fi

if command -v php >/dev/null 2>&1; then
    php artisan key:generate --force --no-interaction 2>/dev/null || true
    touch database/database.sqlite
    php artisan migrate --force --no-interaction 2>/dev/null || true
    php artisan db:seed --force --no-interaction 2>/dev/null || true
    php artisan storage:link --force 2>/dev/null || true
fi

chown -R www-data:www-data "$INSTALL_DIR"
chmod -R ug+rwX "$INSTALL_DIR/storage" "$INSTALL_DIR/bootstrap/cache"

echo ""
echo "✦ Instalación de Cinammon Panel completada con éxito."
echo "  Directorio: $INSTALL_DIR"
echo "  Documentación: https://docs.cinammon.net"
echo ""
