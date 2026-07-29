#!/usr/bin/env bash
# Восстанавливает БД + загрузки из бандла .tgz. ПЕРЕЗАПИСЫВАЕТ текущие данные.
# Запуск НА сервере: bash /opt/gena-lavki/scripts/restore.sh /opt/gena-lavki/backups/<файл>.tgz
# Локально: FORCE=1 WORKDIR="$PWD" COMPOSE_FILE=docker-compose.yml bash scripts/restore.sh backups/<файл>.tgz
set -euo pipefail

WORKDIR="${WORKDIR:-/opt/gena-lavki}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
bundle="${1:?укажи путь к бандлу .tgz}"
[ -f "$bundle" ] || { echo "нет файла: $bundle" >&2; exit 1; }
# абсолютный путь до распаковки cd
case "$bundle" in /*) : ;; *) bundle="$PWD/$bundle" ;; esac

cd "$WORKDIR"
C=(docker compose -f "$COMPOSE_FILE")

if [ "${FORCE:-0}" != 1 ]; then
  printf 'Восстановить из %s? Текущие данные будут перезаписаны. [y/N] ' "$bundle"
  read -r ok
  [ "$ok" = y ] || { echo "отменено"; exit 1; }
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
tar -xzf "$bundle" -C "$work"

# 1) БД (ON_ERROR_STOP — падать на первой ошибке SQL)
gunzip -c "$work/db.sql.gz" \
  | "${C[@]}" exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U catalog -d catalog -v ON_ERROR_STOP=1'

# 2) Загрузки: очистить и распаковать заново
"${C[@]}" exec -T app sh -c 'find /app/public/uploads -mindepth 1 -delete && tar -xzf - -C /app/public/uploads' \
  < "$work/uploads.tgz"

echo "Восстановлено из $bundle"
