#!/usr/bin/env bash
# Mac: разово скачать серверный .env в приватную папку. Запускать при смене секретов.
set -euo pipefail
REMOTE="${REMOTE:-root@201.51.4.231}"
REMOTE_DIR="${REMOTE_DIR:-/opt/gena-lavki}"
SECRETS_DIR="${SECRETS_DIR:-$HOME/gena-lavki-backups/secrets}"

mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"
scp "$REMOTE:$REMOTE_DIR/.env" "$SECRETS_DIR/.env"
chmod 600 "$SECRETS_DIR/.env"
echo "Сохранено: $SECRETS_DIR/.env (запускай снова только при смене секретов)"
