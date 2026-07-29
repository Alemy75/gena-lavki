#!/usr/bin/env bash
# Mac: делает свежий бэкап на сервере и скачивает его сюда.
set -euo pipefail
REMOTE="${REMOTE:-root@201.51.4.231}"
REMOTE_DIR="${REMOTE_DIR:-/opt/gena-lavki}"
LOCAL_DIR="${LOCAL_DIR:-$HOME/gena-lavki-backups}"
KEEP="${KEEP:-30}"

mkdir -p "$LOCAL_DIR"
ssh "$REMOTE" "bash $REMOTE_DIR/scripts/backup.sh"
newest="$(ssh "$REMOTE" "ls -1t $REMOTE_DIR/backups/gena-lavki_*.tgz | head -1")"
[ -n "$newest" ] || { echo "на сервере нет бандлов" >&2; exit 1; }
scp "$REMOTE:$newest" "$LOCAL_DIR/"
ls -1t "$LOCAL_DIR"/gena-lavki_*.tgz 2>/dev/null | tail -n +$((KEEP + 1)) \
  | while IFS= read -r f; do rm -f "$f"; done
echo "Скачано: $LOCAL_DIR/$(basename "$newest")"
