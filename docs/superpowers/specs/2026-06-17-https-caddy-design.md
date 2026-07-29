# HTTPS через Caddy — дизайн

Дата: 2026-06-17. Согласовано: вариант A — Caddy reverse-proxy с `tls internal`.

## Цель

Перевести сайт (Next.js SSR + Postgres, Timeweb VPS, IP 201.51.4.231) на HTTPS.
Фаза 1 (сейчас): self-signed сертификат на голом IP. Фаза 2 (позже): прод-домен с
автоматическим Let's Encrypt. Развилка домена согласована в
[спеке деплоя](2026-06-12-timeweb-deploy-design.md) («когда появится домен — добавим Caddy»).

Let's Encrypt не выдаёт доверенные сертификаты на голый IP, поэтому до появления домена
сертификат self-signed (браузер показывает предупреждение — это принято заказчиком).

## Архитектура

```
Браузер ──443 (TLS)──> [caddy] ──http──> [app:3000] ──> [db]
           80 → редирект на 443         внутренняя docker-сеть, наружу не публикуется
```

Caddy завершает TLS и проксирует на сервис `app` по внутренней docker-сети.
`app` больше не публикует порт на хост — наружу слушает только Caddy (80 и 443).
Caddy для https-сайта автоматически поднимает редирект с 80 на 443.

Код приложения не меняется: `auth.config.ts` уже содержит `trustHost: true`, сессии — JWT.
`reverse_proxy` Caddy по умолчанию проставляет `X-Forwarded-Proto`/`X-Forwarded-Host`,
которые NextAuth v5 при `trustHost` использует для определения https — secure-cookies
(`__Secure-`/`__Host-`) включаются автоматически на HTTPS.

## Компоненты

### `Caddyfile` (новый, в репо, копируется на сервер при деплое)

```
https://{$SITE_ADDRESS} {
    tls internal
    reverse_proxy app:3000
}
```

- `{$SITE_ADDRESS}` подставляется из переменной окружения контейнера `caddy`.
- `tls internal` — сертификат из внутреннего CA Caddy (self-signed), авто-продление.
- Явная схема `https://` заставляет Caddy слушать 443 для TLS и автоматически
  редиректить http→https на 80. Для IP-адреса `tls internal` обязателен (публичный ACME
  на IP невозможен).

### `docker-compose.prod.yml` (правка)

- Сервис `app`: убрать `ports: ["80:3000"]`. Остаётся доступен внутри compose-сети как
  `app:3000`. Остальное (`image`, `env_file`, `volumes`, `depends_on`) без изменений.
- Новый сервис `caddy`:
  - `image: caddy:2-alpine`
  - `restart: unless-stopped`
  - `ports: ["80:80", "443:443"]`
  - `environment: SITE_ADDRESS: ${SITE_ADDRESS:-201.51.4.231}` — дефолт = текущий IP,
    так что отдельная правка серверного `.env` для фазы 1 не нужна.
  - `volumes`:
    - `./Caddyfile:/etc/caddy/Caddyfile:ro`
    - `caddy_data:/data` — хранит внутренний CA и сертификаты (переживает рестарт).
    - `caddy_config:/config`
  - `depends_on: [app]`
- Новые именованные тома: `caddy_data`, `caddy_config`.

### `.github/workflows/deploy.yml` (правка)

- В шаге «Copy compose file to server» (`appleboy/scp-action`) расширить `source` до
  `docker-compose.prod.yml,Caddyfile`, чтобы `Caddyfile` уезжал на сервер
  (`/opt/gena-lavki`) вместе с compose. Шаги build/push/restart без изменений —
  `docker compose up -d` поднимет добавленный сервис `caddy`.

### Сервер (разовая операция, вне кода)

- Открыть **443/tcp** в фаерволе/панели Timeweb (сейчас открыт только 80).

## Переход на домен (фаза 2, без пересборки образа)

1. Навести A-запись домена на 201.51.4.231.
2. В `/opt/gena-lavki/.env` на сервере: `SITE_ADDRESS=<домен>`.
3. В `Caddyfile`: убрать строку `tls internal` — Caddy автоматически получит и будет
   продлевать сертификат Let's Encrypt. Опционально заменить на `tls <email>` для
   уведомлений об истечении.
4. (Опционально) добавить HSTS и при желании задать `AUTH_URL=https://<домен>` в `.env`.

## Решения и ограничения

- **HSTS не включаем на фазе self-signed**: заголовок залочил бы браузер на https для IP
  и мешал бы откату. Добавим вместе с доменом.
- **`AUTH_URL` не задаём**: `trustHost: true` + `X-Forwarded-*` от Caddy достаточно.
  Опционально на фазе 2.
- **Dev не трогаем**: `docker-compose.yml` и локальный `pnpm dev` остаются на http
  (`localhost:3000`). HTTPS — только прод.
- **Откат**: вернуть `ports: ["80:3000"]` сервису `app` и убрать сервис `caddy` —
  сайт снова на http. Тома Caddy можно оставить.

## Проверка

- `docker compose -f docker-compose.prod.yml up -d` поднимает 3 сервиса (`db`, `app`, `caddy`).
- `https://201.51.4.231` открывается (с предупреждением о self-signed сертификате),
  отдаёт каталог; вход в `/admin/login` работает, сессия держится (secure-cookie на https).
- `http://201.51.4.231` редиректит на `https://201.51.4.231`.
- `app` снаружи на 3000 недоступен (порт не опубликован).
