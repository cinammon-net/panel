#!/usr/bin/env bash
# Updater privilegiado de Cinammon (panel + wings + billing), disparado por systemd path unit
# cuando el panel escribe /run/cinammon-update/request.json.
set -euo pipefail

REQUEST=/run/cinammon-update/request.json
STATUS=/run/cinammon-telemetry/update-status.json
PANEL_DIR=/var/www/cinammon-panel
DEMO_DIR=/var/www/cinammon-demo
BILLING_DIR=/var/www/cinammon-billing
WINGS_BIN=/usr/local/bin/wings
PHP=php8.4
PANEL_REPO=cinammon-net/panel
WINGS_REPO=cinammon-net/wings
BILLING_REPO=cinammon-net/billing

LOG=()

status() { # state progress message
  local state="$1" progress="$2" message="$3"
  LOG+=("$(date '+%H:%M:%S') $message")
  mkdir -p "$(dirname "$STATUS")"
  python3 - "$state" "$progress" "$message" "$TARGET" "$VERSION" "${LOG[@]}" <<'PY'
import json, sys
state, progress, message, target, version, *log = sys.argv[1:]
json.dump({
  "target": target, "version": version, "state": state,
  "progress": int(progress), "message": message, "log": log[-30:],
  "updated_at": __import__("datetime").datetime.now().isoformat(),
}, open("/run/cinammon-telemetry/update-status.json", "w"))
PY
  chgrp www-data "$STATUS" 2>/dev/null || true
  chmod 640 "$STATUS"
}

fail() { status error 100 "$1"; exit 1; }

[ -f "$REQUEST" ] || exit 0
TARGET=$(python3 -c "import json;print(json.load(open('$REQUEST'))['target'])")
VERSION=$(python3 -c "import json;print(json.load(open('$REQUEST'))['version'])")
rm -f "$REQUEST"

status queued 5 "Petición recibida: $TARGET v$VERSION"

TMP=$(mktemp -d /var/tmp/cinammon-update.XXXXXX)
trap 'rm -rf "$TMP"' EXIT

if [ "$TARGET" = "panel" ]; then
  URL="https://github.com/$PANEL_REPO/releases/download/v$VERSION/panel.tar.gz"
  status downloading 20 "Descargando $URL"
  curl -fsSL "$URL" -o "$TMP/panel.tar.gz" || fail "No se pudo descargar panel.tar.gz del release v$VERSION (¿subiste el asset?)"
  mkdir -p "$TMP/panel" && tar -xzf "$TMP/panel.tar.gz" -C "$TMP/panel"
  SRC="$TMP/panel"; [ -d "$TMP/panel/panel" ] && SRC="$TMP/panel/panel"

  for DIR in "$PANEL_DIR" "$DEMO_DIR"; do
    [ -d "$DIR" ] || continue
    OWNER=$([ "$DIR" = "$DEMO_DIR" ] && echo cinammon-demo || echo www-data)
    status applying 50 "Aplicando archivos en $DIR"
    rsync -a --delete \
      --exclude .env --exclude storage --exclude bootstrap/cache \
      --exclude node_modules --exclude .git \
      "$SRC/" "$DIR/"
    chown -R "$OWNER":"$OWNER" "$DIR"
    # fijar la versión instalada en .env
    if grep -q '^PANEL_VERSION=' "$DIR/.env"; then
      sed -i "s/^PANEL_VERSION=.*/PANEL_VERSION=$VERSION/" "$DIR/.env"
    else
      echo "PANEL_VERSION=$VERSION" >> "$DIR/.env"
    fi
    status migrating 75 "Migraciones y caches en $DIR"
    sudo -u "$OWNER" env HOME=/tmp XDG_CONFIG_HOME=/tmp $PHP "$DIR/artisan" migrate --force
    sudo -u "$OWNER" env HOME=/tmp XDG_CONFIG_HOME=/tmp $PHP "$DIR/artisan" optimize:clear
  done

  status restarting 90 "Reiniciando queue worker"
  systemctl restart cinammonq.service || true
  systemctl reload php8.4-fpm || true

elif [ "$TARGET" = "wings" ]; then
  ARCH=$(uname -m); [ "$ARCH" = "x86_64" ] && ASSET=wings_linux_amd64 || ASSET=wings_linux_arm64
  URL="https://github.com/$WINGS_REPO/releases/download/v$VERSION/$ASSET"
  status downloading 25 "Descargando $URL"
  curl -fsSL "$URL" -o "$TMP/wings" || fail "No se pudo descargar $ASSET del release v$VERSION (¿subiste el binario?)"
  chmod +x "$TMP/wings"
  "$TMP/wings" version >/dev/null 2>&1 || "$TMP/wings" --help >/dev/null 2>&1 || fail "El binario descargado no se puede ejecutar"
  status applying 60 "Instalando binario en $WINGS_BIN"
  cp "$WINGS_BIN" "$WINGS_BIN.bak" 2>/dev/null || true
  install -m 0755 "$TMP/wings" "$WINGS_BIN"
  status restarting 85 "Reiniciando wings.service"
  systemctl restart wings.service || { install -m 0755 "$WINGS_BIN.bak" "$WINGS_BIN"; systemctl restart wings.service; fail "Wings no arrancó; se restauró el binario anterior"; }
elif [ "$TARGET" = "billing" ]; then
  URL="https://github.com/$BILLING_REPO/releases/download/v$VERSION/billing.tar.gz"
  status downloading 20 "Descargando $URL"
  curl -fsSL "$URL" -o "$TMP/billing.tar.gz" || fail "No se pudo descargar billing.tar.gz del release v$VERSION (¿subiste el asset?)"
  mkdir -p "$TMP/billing" && tar -xzf "$TMP/billing.tar.gz" -C "$TMP/billing"
  SRC="$TMP/billing"; [ -d "$TMP/billing/billing" ] && SRC="$TMP/billing/billing"
  [ -d "$BILLING_DIR" ] || fail "No existe $BILLING_DIR"

  status applying 50 "Aplicando archivos en $BILLING_DIR"
  rsync -a --delete \
    --exclude .env --exclude storage --exclude bootstrap/cache \
    --exclude node_modules --exclude .git \
    "$SRC/" "$BILLING_DIR/"
  chown -R www-data:www-data "$BILLING_DIR"
  if grep -q '^BILLING_VERSION=' "$BILLING_DIR/.env"; then
    sed -i "s/^BILLING_VERSION=.*/BILLING_VERSION=$VERSION/" "$BILLING_DIR/.env"
  else
    echo "BILLING_VERSION=$VERSION" >> "$BILLING_DIR/.env"
  fi
  status migrating 75 "Migraciones, seeder de planes y caches"
  sudo -u www-data env HOME=/tmp XDG_CONFIG_HOME=/tmp $PHP "$BILLING_DIR/artisan" migrate --force
  sudo -u www-data env HOME=/tmp XDG_CONFIG_HOME=/tmp $PHP "$BILLING_DIR/artisan" db:seed --class=PlanSeeder --force || true
  sudo -u www-data env HOME=/tmp XDG_CONFIG_HOME=/tmp $PHP "$BILLING_DIR/artisan" optimize:clear
  status restarting 90 "Recargando PHP-FPM"
  systemctl reload php8.4-fpm || true

else
  fail "Target desconocido: $TARGET"
fi

status done 100 "$TARGET actualizado a v$VERSION"
