#!/usr/bin/env bash
# Создаёт бэкап БД + загрузок одним .tgz и чистит старые.
# Запуск НА сервере: bash /opt/gena-lavki/scripts/backup.sh
# Локально против dev-стека:
#   WORKDIR="$PWD" COMPOSE_FILE=docker-compose.yml BACKUP_DIR="$PWD/backups" bash scripts/backup.sh
set -euo pipefail

WORKDIR="${WORKDIR:-/opt/gena-lavki}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-$WORKDIR/backups}"
KEEP="${KEEP:-14}"

cd "$WORKDIR"
C=(docker compose -f "$COMPOSE_FILE")

ts="$(date +%Y-%m-%d_%H%M%S)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# 1) Дамп БД (пароль из окружения контейнера, коннект по локальному сокету)
"${C[@]}" exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U catalog -d catalog --clean --if-exists' \
  | gzip > "$work/db.sql.gz"

# 2) Загрузки (том catalog_uploads смонтирован в app:/app/public/uploads)
"${C[@]}" exec -T app tar -czf - -C /app/public/uploads . > "$work/uploads.tgz"

# 3) Манифест
{
  echo "created: $ts"
  echo "compose_file: $COMPOSE_FILE"
  echo "app_image: $("${C[@]}" images -q app 2>/dev/null || true)"
  "${C[@]}" exec -T db postgres --version 2>/dev/null || true
} > "$work/manifest.txt"

# 4) Единый бандл
mkdir -p "$BACKUP_DIR"
bundle="$BACKUP_DIR/gena-lavki_${ts}.tgz"
tar -czf "$bundle" -C "$work" db.sql.gz uploads.tgz manifest.txt

# 5) Ротация: оставить KEEP самых свежих (bash 3.2-safe, без xargs -r)
ls -1t "$BACKUP_DIR"/gena-lavki_*.tgz 2>/dev/null | tail -n +$((KEEP + 1)) \
  | while IFS= read -r f; do rm -f "$f"; done

echo "OK: $bundle"
