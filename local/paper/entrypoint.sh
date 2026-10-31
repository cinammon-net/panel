#!/bin/bash
set -e

cd /home/container || exit 1

# Execute startup command
eval "$STARTUP"
