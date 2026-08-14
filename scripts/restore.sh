#!/usr/bin/env bash
# Восстанавливает БД + загрузки из бандла .tgz. ПЕРЕЗАПИСЫВАЕТ текущие данные.
# Запуск НА сервере: bash /opt/gena-lavki/scripts/restore.sh /opt/gena-lavki/backups/<файл>.tgz
# Локально: FORCE=1 WORKDIR="$PWD" COMPOSE_FILE=docker-compose.yml bash scripts/restore.sh backups/<файл>.tgz
# Нужны работающие контейнеры db и app (если стек мёртв — сначала docker compose up -d).
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

# 1) Состав и целостность — до любых изменений данных. Дамп распаковываем в файл
#    сразу: битый gzip останавливает нас ещё до psql. Пайпить gunzip|psql нельзя:
#    усечённый поток выглядит для psql «нормальным» EOF, и он закоммитил бы
#    пол-дампа.
for f in db.sql.gz uploads.tgz; do
  [ -f "$work/$f" ] || { echo "в архиве нет $f — это не бандл бэкапа" >&2; exit 1; }
done
gunzip -c "$work/db.sql.gz" > "$work/db.sql"
tar -tzf "$work/uploads.tgz" > /dev/null

# 2) БД одной транзакцией: ошибка в любом месте дампа откатывает всё целиком,
#    текущие данные не тронуты. Перед дампом сносим схему: таблицы, появившиеся
#    ПОСЛЕ бэкапа, дамп с --clean не дропает — они пережили бы restore и уронили
#    migrate deploy («already exists»).
"${C[@]}" exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U catalog -d catalog -w -v ON_ERROR_STOP=1 --single-transaction --quiet -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" -f -' \
  < "$work/db.sql"

# 3) Миграции: бэкап может быть от старой схемы — догоняем до текущего кода
#    (та же команда, что выполняется при старте контейнера)
"${C[@]}" exec -T app prisma migrate deploy

# 4) Загрузки: очистить и распаковать заново — только после успеха БД
"${C[@]}" exec -T app sh -c 'find /app/public/uploads -mindepth 1 -delete && tar -xzf - -C /app/public/uploads' \
  < "$work/uploads.tgz"

# 5) Перезапуск app: после пересоздания таблиц у работающего приложения остаются
#    протухшие коннекты/prepared statements Prisma — до рестарта возможны ошибки
"${C[@]}" restart app

echo "Восстановлено из $bundle"
