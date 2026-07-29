#!/usr/bin/env bash
# Mac: залить локальный бандл на сервер и восстановить из него (DR).
set -euo pipefail
REMOTE="${REMOTE:-root@201.51.4.231}"
REMOTE_DIR="${REMOTE_DIR:-/opt/gena-lavki}"
bundle="${1:?укажи путь к локальному бандлу .tgz}"
[ -f "$bundle" ] || { echo "нет файла: $bundle" >&2; exit 1; }

base="$(basename "$bundle")"
ssh "$REMOTE" "mkdir -p $REMOTE_DIR/backups"
scp "$bundle" "$REMOTE:$REMOTE_DIR/backups/$base"
ssh -t "$REMOTE" "bash $REMOTE_DIR/scripts/restore.sh $REMOTE_DIR/backups/$base"
