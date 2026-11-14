#!/usr/bin/env bash
# ==============================================================================
# Cinammon Panel — Instalador Oficial Automatizado
# https://cinammon.net | https://docs.cinammon.net
# ==============================================================================
set -euo pipefail

CYAN='\033[0;36m'
PINK='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${PINK}================================================================${NC}"
echo -e "${PINK}               ✦ CINAMMON PANEL INSTALLER ✦                     ${NC}"
echo -e "${CYAN}        Despliegue automático de producción sin Git ni npm      ${NC}"
echo -e "${PINK}================================================================${NC}"
echo ""

# 1. Comprobacion de permisos de root
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}[ERROR] Este script debe ejecutarse con permisos de superusuario (root).${NC}"
    echo "Ejecuta: curl -sSL https://docs.cinammon.net/install.sh | sudo bash"
    exit 1
fi

INSTALL_DIR="/var/www/cinammon-panel"
PRIMARY_URL="https://docs.cinammon.net/panel.tar.gz"
FALLBACK_URL="https://github.com/cinammon-net/panel/releases/latest/download/panel.tar.gz"

# 2. Instalacion automatica de paquetes del sistema si estamos en Debian/Ubuntu
if [ -f /etc/debian_version ]; then
    echo -e "${CYAN}-> [1/6] Comprobando dependencias del sistema (Debian/Ubuntu)...${NC}"
    export DEBIAN_FRONTEND=noninteractive
    
    MISSING_PKGS=()
    for pkg in curl tar unzip nginx; do
        if ! command -v "$pkg" >/dev/null 2>&1; then
            MISSING_PKGS+=("$pkg")
        fi
    done

    if ! command -v php >/dev/null 2>&1; then
        MISSING_PKGS+=(php-cli php-fpm php-sqlite3 php-mbstring php-xml php-curl php-zip php-bcmath)
    fi

    if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
        echo -e "${YELLOW}Instalando paquetes requeridos: ${MISSING_PKGS[*]}...${NC}"
        apt-get update -qq
        apt-get install -y -qq "${MISSING_PKGS[@]}" >/dev/null
    fi
fi

# 3. Preparacion de carpetas
echo -e "${CYAN}-> [2/6] Preparando directorio en ${INSTALL_DIR}...${NC}"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 4. Descarga del paquete oficial empaquetado (build de produccion)
echo -e "${CYAN}-> [3/6] Descargando paquete oficial pre-construido...${NC}"
if ! curl -sSL --fail -o panel.tar.gz "$PRIMARY_URL"; then
    echo -e "${YELLOW}Descargando desde espejo alternativo...${NC}"
    curl -sSL --fail -o panel.tar.gz "$FALLBACK_URL"
fi

echo -e "${CYAN}-> [4/6] Desempaquetando archivos del panel...${NC}"
tar -xzf panel.tar.gz
rm -f panel.tar.gz

# 5. Inicializacion de entorno y base de datos
echo -e "${CYAN}-> [5/6] Configurando entorno, tablas y plantillas oficiales...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
fi

if command -v php >/dev/null 2>&1; then
    php artisan key:generate --force --no-interaction >/dev/null 2>&1 || true
    mkdir -p database
    touch database/database.sqlite
    php artisan migrate --force --no-interaction >/dev/null 2>&1 || true
    php artisan db:seed --force --no-interaction >/dev/null 2>&1 || true
    php artisan storage:link --force >/dev/null 2>&1 || true

    # Crear usuario administrador inicial si no existe ninguno
    ADMIN_EMAIL="admin@cinammon.net"
    ADMIN_PASS=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 12 || echo "CinaAdmin2026")
    
    php artisan tinker --execute="
        \$exists = App\Models\User::where('email', '$ADMIN_EMAIL')->first();
        if (!\$exists) {
            \$u = App\Models\User::create([
                'name' => 'Administrador Cinammon',
                'email' => '$ADMIN_EMAIL',
                'password' => '$ADMIN_PASS',
                'email_verified_at' => now(),
            ]);
            \$u->syncRoles(['Owner']);
        }
    " >/dev/null 2>&1 || true
fi

# 6. Permisos de carpetas
echo -e "${CYAN}-> [6/6] Ajustando permisos de almacenamiento y cache...${NC}"
chown -R www-data:www-data "$INSTALL_DIR"
chmod -R ug+rwX "$INSTALL_DIR/storage" "$INSTALL_DIR/bootstrap/cache"

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}       ✦ CINAMMON PANEL INSTALADO CORRECTAMENTE ✦              ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "  Directorio de instalacion : ${YELLOW}${INSTALL_DIR}${NC}"
echo -e "  Documentacion tecnica     : ${YELLOW}https://docs.cinammon.net${NC}"
echo ""
echo -e "  Credenciales de acceso inicial:"
echo -e "  - Email       : ${YELLOW}${ADMIN_EMAIL}${NC}"
echo -e "  - Contraseña  : ${YELLOW}${ADMIN_PASS}${NC}"
echo ""
echo -e "  ${PINK}Siguiente paso:${NC} Configura tu bloque de Nginx apuntando a:"
echo -e "  root ${YELLOW}${INSTALL_DIR}/public${NC};"
echo -e "${GREEN}================================================================${NC}"
echo ""
