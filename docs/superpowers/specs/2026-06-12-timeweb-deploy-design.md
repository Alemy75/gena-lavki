# Деплой на Timeweb VPS — дизайн

Дата: 2026-06-12. Согласовано: вариант «сборка в GitHub Actions» (вариант А).

## Цель

Авто-деплой каталога (Next.js 16 SSR + Postgres) на Timeweb VPS (1 vCPU / 1 ГБ RAM / 14 ГБ NVMe,
Ubuntu 24.04, IP 201.51.4.231) при каждом пуше в `main`. Vercel Blob откачен — загрузки
пишутся на диск в Docker-том `catalog_uploads`.

## Архитектура

```
push в main
  → GitHub Actions: docker build (x86-раннер, кэш GHA)
  → push образа в ghcr.io/alemy75/gena-lavki:{latest, <sha>}
  → scp docker-compose.prod.yml → сервер /opt/gena-lavki/docker-compose.yml
  → ssh: docker login ghcr.io (эфемерный GITHUB_TOKEN) && docker compose pull && up -d && image prune
```

Сервер ничего не собирает: только тянет готовый образ и перезапускает контейнеры.
Простой — секунды на пересоздание контейнера `app`.

## Компоненты

- **`docker-compose.prod.yml`** (в репо, копируется на сервер при каждом деплое):
  сервисы `db` (postgres:16-alpine, без публикации порта наружу) и `app`
  (образ из GHCR, порт 80→3000, том загрузок). `restart: unless-stopped`.
  Пароль БД и секреты — из `/opt/gena-lavki/.env` на сервере (в репо не попадает).
- **`.github/workflows/deploy.yml`**: build → push GHCR → scp + ssh-деплой.
  Секреты репо: `DEPLOY_HOST`, `DEPLOY_SSH_KEY` (отдельный ключ только для деплоя).
  Авторизация сервера в GHCR — каждым деплоем через `GITHUB_TOKEN` (PAT не нужен,
  работает и для приватного репо).
- **Сервер** (настроен один раз): swap 2 ГБ (`vm.swappiness=10`) — страховка рантайма
  на 1 ГБ RAM; Docker из официального скрипта; `/opt/gena-lavki/.env` с прод-секретами
  (AUTH_SECRET, POSTGRES_PASSWORD, ADMIN_*, SMTP_* — сгенерированы/перенесены вручную).
- **Миграции**: `prisma migrate deploy` уже в CMD Dockerfile — накатываются при каждом
  старте контейнера. Сид — разовый `docker compose exec app node prisma/seed.js`.

## Решения и ограничения

- **Без домена/HTTPS**: сайт на `http://201.51.4.231`. `AUTH_URL` не задаём
  (`trustHost: true`). Когда появится домен — добавим Caddy с автосертификатом.
- **SMTP заблокирован Timeweb** (исходящие 25/465/587/2525 закрыты): включаем
  `CONTACT_SAVE_IF_MAIL_FAILS=1` — заявки сохраняются в БД. Параллельно можно просить
  поддержку открыть порты или перейти на HTTP-API почты.
- **Откат релиза**: образы тегируются sha — `docker compose up -d` с конкретным тегом.
- **Бэкапы**: вне скоупа этого деплоя (панельные снапшоты Timeweb или cron с pg_dump — позже).

## Ошибки и проверка

- Падение сборки/деплоя видно в Actions; сайт продолжает работать на старом образе.
- Проверка деплоя: открыть `http://201.51.4.231`, логин в `/admin/login`,
  загрузка картинки в админке (том), заявка с формы → запись в БД.
