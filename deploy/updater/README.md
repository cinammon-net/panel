# Updater automático de Cinammon

El panel muestra un aviso cuando publicas un release en GitHub y, al pulsar
**Actualizar ahora**, deja una petición que ejecuta este updater privilegiado.
El usuario no tiene que tocar nada: descarga, aplica, migra y reinicia solo.

## Convención de releases

- **Panel** (`cinammon-net/panel`): release con tag `vX.Y.Z` y un asset
  `panel.tar.gz` que contenga la aplicación ya construida (incluye
  `public/build` de Vite; sin `node_modules`, sin `.env`, sin `storage`).
  Cómo generarlo en local:

  ```bash
  npm run build
  tar -czf panel.tar.gz --exclude .env --exclude storage --exclude node_modules \
      --exclude .git --exclude bootstrap/cache -C . .
  gh release create vX.Y.Z panel.tar.gz --title "vX.Y.Z" --notes "..."
  ```

- **Wings** (`cinammon-net/wings`): release con tag `vX.Y.Z` y el binario
  `wings_linux_amd64` (y opcionalmente `wings_linux_arm64`).

## Instalación en el VPS (una sola vez, como root)

```bash
install -m 0755 cinammon-update.sh /usr/local/sbin/cinammon-update.sh
install -m 0644 cinammon-update.service /etc/systemd/system/
install -m 0644 cinammon-update.path /etc/systemd/system/
install -m 0644 cinammon-update.tmpfiles.conf /etc/tmpfiles.d/cinammon-update.conf
systemd-tmpfiles --create /etc/tmpfiles.d/cinammon-update.conf
systemctl daemon-reload
systemctl enable --now cinammon-update.path
```

## Flujo

1. El panel consulta `releases/latest` de GitHub (cache 30 min) y muestra el
   banner + la página **/updates** a los admins.
2. Al pulsar «Actualizar ahora», el panel escribe
   `/run/cinammon-update/request.json` (dir `root:www-data 0770`).
3. La *path unit* lanza `cinammon-update.sh`, que publica su progreso en
   `/run/cinammon-telemetry/update-status.json` (el panel lo muestra en vivo).
4. Panel: descarga `panel.tar.gz`, rsync sobre `/var/www/cinammon-panel` y
   `/var/www/cinammon-demo` (preservando `.env`, `storage`), fija
   `PANEL_VERSION` en `.env`, `migrate --force`, `optimize:clear` y reinicia
   el queue worker. Wings: instala el binario con rollback si no arranca.

## Variables de entorno del panel

- `PANEL_VERSION` — versión instalada (la fija el updater).
- `PANEL_UPDATE_REPO` / `PANEL_WINGS_UPDATE_REPO` — repos de GitHub.
- `PANEL_UPDATE_GITHUB_TOKEN` — opcional, para repos privados o más rate limit.
