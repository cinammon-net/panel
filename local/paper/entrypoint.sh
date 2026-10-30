#!/bin/sh
set -eu
cd /home/container
exec /bin/sh -c "exec ${STARTUP}"
