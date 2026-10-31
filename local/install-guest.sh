#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/.." && pwd)
cd "$repo"
if ! grep -q '^APP_KEY=base64:' .env; then
  local/guest-php php artisan key:generate --no-interaction
fi
local/guest-php php artisan migrate --force
local/guest-php php artisan db:seed --force
local/guest-php php local/setup.php
sudo install -m 0755 /home/nini.linux/cinammon-wings/wings /usr/local/bin/cinammon-wings
sudo install -d -m 0700 /etc/cinammon
sudo install -m 0600 local/config.yml /etc/cinammon/config.yml
sudo tee /etc/systemd/system/cinammon-wings.service > /dev/null <<UNIT
[Unit]
Description=Cinammon Wings local node
After=docker.service network-online.target
Requires=docker.service
[Service]
ExecStart=/usr/local/bin/cinammon-wings --config /etc/cinammon/config.yml
Restart=on-failure
RestartSec=5
[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
# These names belong exclusively to this local environment.
for name in cinammon-panel cinammon-scheduler; do
  if sudo docker container inspect "$name" >/dev/null 2>&1; then
    echo "$name already exists; use local/dev start instead of reinstalling." >&2
    exit 1
  fi
done
sudo docker run -d --name cinammon-panel --restart unless-stopped \
  --user "$(id -u):$(id -g)" --network host -v "$repo:$repo" -w "$repo" \
  cinammon-panel-local:php84 php artisan serve --host=0.0.0.0 --port=8000
sudo docker run -d --name cinammon-scheduler --restart unless-stopped \
  --user "$(id -u):$(id -g)" --network host -v "$repo:$repo" -w "$repo" \
  cinammon-panel-local:php84 php artisan schedule:work
sudo systemctl enable --now cinammon-wings
