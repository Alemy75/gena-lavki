# Резервное копирование и восстановление — дизайн

Дата: 2026-07-29. Согласовано: **вариант A** — короткие скрипты в репозитории + Makefile.
Ручные дампы; копии хранятся и на VPS (быстрый откат), и скачиваются на Mac (off-site).

## Цель

Дать проекту (Next.js + Postgres в Docker на Timeweb VPS, IP 201.51.4.231, домен
boost-by-ai.ru) систему бэкапов **без каких-либо дополнительных платных сервисов** —
только VPS и личный Mac. Бэкапы запускаются вручную, короткими командами.

## Контекст и модель угроз

Всё состояние живёт на диске VPS в именованных Docker-томах: `postgres_data` (БД),
`catalog_uploads` (фото товаров), `caddy_data` (сертификаты). Бэкапов сейчас нет.

| Угроза | Чем закрывается |
|--------|-----------------|
| Кривая миграция / случайно удалил данные в админке | Локальные бэкапы на VPS — откат за секунды |
| Сбой диска ВМ | Копии, скачанные на Mac |
| **Удаление VPS через 7 дней неоплаты** (см. [спеку деплоя](2026-06-12-timeweb-deploy-design.md)) | Копии на Mac (off-site) + автоплатёж/баланс в панели Timeweb |

Ключевой принцип: бэкап, который лежит только на VPS, **не спасает** от удаления сервера.
Поэтому обязательна регулярная выгрузка на Mac. Личный компьютер — это бесплатный off-site.

## Что бэкапим

Обычный бэкап (частый, скачивается на Mac) — **без секретов**:

- `db.sql.gz` — логический `pg_dump` базы `catalog` с `--clean --if-exists` (восстановление
  чисто перезаписывает объекты). Содержит: позиции каталога, категории, пользователей,
  настройки сайта, соцссылки, **заявки с формы**, страницы.
- `uploads.tgz` — содержимое тома `catalog_uploads` (`/app/public/uploads`), фото товаров.
- `manifest.txt` — дата, id образа `app`, версия Postgres.

Секреты (`.env`) — **отдельно и разово** (файл почти не меняется). Не кладём в обычные
архивы, чтобы часто скачиваемые бэкапы не содержали паролей.

## Структура и артефакты в репозитории

```
catalog/
  Makefile                 # удобные команды (pull, pull-secrets, backup, restore)
  scripts/
    backup.sh              # запускается НА сервере: собрать бандл + ротация
    restore.sh             # запускается НА сервере: восстановить из бандла
    pull-backup.sh         # запускается на Mac: ssh backup.sh + scp бандла вниз
    pull-env.sh            # запускается на Mac: разово скачать .env в приватную папку
    push-restore.sh        # запускается на Mac (DR): залить бандл на сервер + restore
```

Серверные скрипты (`backup.sh`, `restore.sh`) доезжают на сервер тем же деплоем: в шаге
`scp` файла [deploy.yml](../../../.github/workflows/deploy.yml) расширяем `source` до
`docker-compose.prod.yml,Caddyfile,scripts/backup.sh,scripts/restore.sh`. На сервере они
лежат в `/opt/gena-lavki/scripts/`. Так сервер всегда имеет актуальные скрипты и может
бэкапить сам себя, даже когда Mac недоступен.

## Скрипты (эскиз, детали — в плане реализации)

**`scripts/backup.sh`** (на сервере, `/opt/gena-lavki`):

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /opt/gena-lavki
C="docker compose -f docker-compose.prod.yml"
DIR=/opt/gena-lavki/backups; KEEP=14
ts=$(date +%Y-%m-%d_%H%M); work=$(mktemp -d); trap 'rm -rf "$work"' EXIT

$C exec -T db  sh -c 'PGPASSWORD=$POSTGRES_PASSWORD pg_dump -U catalog -d catalog --clean --if-exists' | gzip > "$work/db.sql.gz"
$C exec -T app tar -czf - -C /app/public/uploads . > "$work/uploads.tgz"
{ echo "created: $ts"; echo "image: $($C images -q app)"; $C exec -T db postgres --version; } > "$work/manifest.txt"

mkdir -p "$DIR"; tar -czf "$DIR/gena-lavki_${ts}.tgz" -C "$work" .
ls -1t "$DIR"/gena-lavki_*.tgz | tail -n +$((KEEP+1)) | xargs -r rm -f
echo "OK: $DIR/gena-lavki_${ts}.tgz"
```

Подключение к БД — по локальному сокету внутри контейнера, пароль берётся из уже
присутствующей в контейнере переменной `POSTGRES_PASSWORD` (не завязываемся на `pg_hba`).

**`scripts/pull-backup.sh`** (на Mac) — главная команда:

```bash
#!/usr/bin/env bash
set -euo pipefail
REMOTE="${REMOTE:-root@201.51.4.231}"; DIR="${LOCAL_DIR:-$HOME/gena-lavki-backups}"; KEEP=30
mkdir -p "$DIR"
ssh "$REMOTE" 'bash /opt/gena-lavki/scripts/backup.sh'
newest=$(ssh "$REMOTE" 'ls -1t /opt/gena-lavki/backups/gena-lavki_*.tgz | head -1')
scp "$REMOTE:$newest" "$DIR/"
ls -1t "$DIR"/gena-lavki_*.tgz | tail -n +$((KEEP+1)) | xargs -r rm -f
echo "Скачано: $DIR/$(basename "$newest")"
```

**`scripts/pull-env.sh`** (на Mac, редко) — скачать `.env` в приватную папку `chmod 600`.
**`scripts/restore.sh`** (на сервере) — распаковать бандл, залить `db.sql.gz` через `psql`,
перезаписать `uploads`; перед выполнением спрашивает подтверждение.
**`scripts/push-restore.sh`** (на Mac) — `scp` выбранного локального бандла на сервер и
запуск `restore.sh` (для восстановления на новом VPS).

**Makefile** — тонкие обёртки: `make pull`, `make pull-secrets`, `make backup`,
`make restore FILE=…`. Переменная `REMOTE ?= root@201.51.4.231`.

## Ротация

- На сервере — последние 14 бандлов, старые удаляются в `backup.sh`.
- На Mac — последние 30, старые удаляются в `pull-backup.sh`.

## Восстановление — два runbook'а

**1. Откат на том же VPS** (кривая миграция, случайно удалили данные):

```bash
ssh root@201.51.4.231
bash /opt/gena-lavki/scripts/restore.sh /opt/gena-lavki/backups/gena-lavki_<ts>.tgz
```

Секунды. Если бандл только на Mac — сначала `make restore FILE=~/gena-lavki-backups/…tgz`
(через `push-restore.sh`).

**2. Полная пересборка на новом VPS** (сервер удалён за неоплату):

1. Завести новый VPS, поставить Docker (по [спеке деплоя](2026-06-12-timeweb-deploy-design.md)).
2. Положить в `/opt/gena-lavki/`: `docker-compose.prod.yml` + `Caddyfile` (из git) и
   `.env` (из приватной копии, `pull-env.sh`).
3. `docker compose -f docker-compose.prod.yml up -d` — поднимет БД (пустую) и накатит
   схему через `prisma migrate deploy`.
4. `make restore FILE=…` с Mac — зальёт данные (дамп с `--clean` перезапишет пустую схему)
   и фото.
5. Перенаправить DNS на новый IP (домен на reg.ru).

## Защита именно от сценария неоплаты

Бэкапы — страховка, а не лекарство. В панели Timeweb дополнительно:
- включить **автоплатёж**, держать буфер на балансе;
- включить **уведомления о низком балансе**.

Это не даёт наступить 7-дневному удалению; копии на Mac спасают, если всё же наступило.

## Опционально (бонус, не замена)

Снимок диска в панели Timeweb — удобный быстрый откат всей ВМ. Но живёт на Timeweb и
удаляется вместе с аккаунтом при неоплате, поэтому не заменяет выгрузку на Mac.

## Решения и ограничения (YAGNI)

- **Без cron/автоматики** — по требованию пользователя всё вручную. Главное — привычка
  запускать `make pull` перед деплоем/правкой контента и раз в неделю.
- **Без облачных хранилищ (S3 и т.п.)** — по требованию «только VPS». Off-site = Mac.
- **Обычный `pg_dump | gzip`**, не custom-формат — проще читать и восстанавливать; для БД
  такого размера достаточно.
- **`.env` — отдельно, вручную, при смене секретов.**

## Проверка

- `make pull` создаёт бандл на сервере (в `backups/` появляется файл) и скачивает его в
  `~/gena-lavki-backups/`; повторный запуск соблюдает ротацию.
- В тестовой БД удалить позицию каталога → `restore.sh` из свежего бандла возвращает её.
- `uploads.tgz` содержит реальные файлы; после restore картинки открываются на сайте.
- `pull-env.sh` кладёт `.env` с правами `600` в приватную папку.
