# Webs de hosting detrás de Cloudflare (nodo)

Los servidores cuyo huevo es de categoría `web` se publican como
`https://<nombre>-<uuid4>.<PANEL_SITES_DOMAIN>` (registro DNS comodín `*` con proxy de
Cloudflare) y su `IP:puerto` directo se bloquea, así la IP del nodo no se ve.

- `cinammon-sites.conf` → `/etc/nginx/sites-available/` (+ enlace en `sites-enabled/`).
  Usa `/etc/nginx/cinammon-sites.map` y un certificado propio `/etc/nginx/ssl/cinammon-sites.{crt,key}`
  para `*.<dominio>` (Cloudflare en modo SSL "Full").
- `cinammon-sites-sync` → `/usr/local/sbin/` (root). Ejecuta `php artisan sites:export`, reescribe
  el mapa de nginx y bloquea los puertos en la cadena iptables `CINAMMON-SITES` (desde `DOCKER-USER`,
  porque los puertos publicados por Docker se saltan ufw).
- `cinammon-sites-sync.service` / `.timer` → `/etc/systemd/system/`; `systemctl enable --now cinammon-sites-sync.timer` (cada minuto).

Panel `.env`: `PANEL_PUBLIC_HOST=play.cinammon.net` (registro DNS solo-DNS, para juegos) y
`PANEL_SITES_DOMAIN=cinammon.net` (solo en el panel real, no en la demo).
