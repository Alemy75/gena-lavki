# Переезд на новый VPS и домен

## Задача

Развернуть приложение с нуля на новом Timeweb VPS `200.165.234.167` под новым
доменом `lavki76.ru`. Данные со старого сервера (`201.51.4.231`,
`boost-by-ai.ru`) не переносим — стартуем с пустой БД и сидом. Старый домен
бросаем, редиректы не делаем.

## Решение

Стек не меняется: `docker-compose.prod.yml` (Postgres 16 + app из GHCR + Caddy),
`/opt/gena-lavki`, деплой из GitHub Actions по SSH. Меняются адреса и способ
подготовки машины.

**Правки в репозитории**

| Файл | Изменение |
|------|-----------|
| `Caddyfile` | `lavki76.ru` + редирект с `www` |
| `Makefile`, `scripts/pull-*.sh`, `scripts/push-restore.sh` | `REMOTE` → `root@200.165.234.167` |
| `.env.example` | пример `SITE_URL` на новый домен |
| `scripts/provision-server.sh` | новый: bootstrap чистого VPS |
| `README.md` | раздел «Развёртывание: новый VPS с нуля» |

**`scripts/provision-server.sh`** — идемпотентный bootstrap Debian/Ubuntu:
Docker через `get.docker.com`, каталоги `/opt/gena-lavki{,/backups,/scripts}`,
публичный ключ деплоя в `authorized_keys`, генерация `.env` (`POSTGRES_PASSWORD`,
`AUTH_SECRET`, `AUTH_URL`, `SITE_URL`, пароль первого админа) с `umask 077`.
Существующий `.env` не перетирается: пароль БД зашит в том `postgres_data` при
первом старте кластера, и расхождение сломало бы подключение.

`POSTGRES_PASSWORD` генерируется без символов `/+=` — он подставляется в
`DATABASE_URL` через интерполяцию compose, и спецсимволы порвали бы URL.

**Заодно чиним:** на старом проде не заданы `SITE_URL`/`AUTH_URL`, поэтому
`lib/site.ts` отдаёт `http://localhost:3000` в canonical, Open Graph и
`sitemap.xml`. Новый `.env` задаёт их явно.

## Порядок переключения

1. `scp` файлов стека на сервер → `provision-server.sh` → заполнить `SMTP_*`.
2. `docker compose up -d` (миграции применяются при старте контейнера) → `node prisma/seed.js`.
3. A-записи `lavki76.ru` и `www` → `200.165.234.167`; Caddy выпускает сертификат
   Let's Encrypt только после того, как домен резолвится на этот IP.
4. Секрет `DEPLOY_HOST` в GitHub → новый IP; дальше пуш в `main` деплоит как раньше.

## Проверка

Сайт открывается по HTTPS, вход в `/admin/login`, загрузка изображения переживает
`docker compose restart app`, `robots.txt`/`sitemap.xml` содержат `lavki76.ru`,
форма «Связаться с нами» доставляет письмо.

## Что осталось за рамками

Старый VPS не трогаем — он живой и служит запасом, пока новый не проверен.
Домен `lavki76.ru` в статусе `UNVERIFIED`: данные владельца надо подтвердить у
регистратора в течение 30 дней с 14.08.2026, иначе делегирование снимут.
