# Каталог (catalog)

Веб-приложение на **Next.js** (App Router): публичный каталог позиций из PostgreSQL, админка с входом по email/паролю (NextAuth) и загрузкой изображений на диск.

---

## Архитектура

```mermaid
flowchart TB
  subgraph client [Браузер]
    Home["/ — каталог"]
    Admin["/admin — админка"]
    Login["/admin/login"]
  end

  subgraph next [Next.js]
    RSC["Server Components / Route Handlers"]
    MW["middleware — защита /admin"]
    API["/api/catalog-items GET|POST"]
    Auth["/api/auth/* — NextAuth"]
  end

  subgraph data [Данные]
    PG[(PostgreSQL)]
    FS["public/uploads — файлы"]
  end

  Home --> RSC
  Admin --> RSC
  Login --> RSC
  RSC --> API
  RSC --> Auth
  MW --> Auth
  API --> PG
  API --> FS
  Auth --> PG
```

| Слой | Назначение |
|------|------------|
| **UI** | `app/page.tsx` — список из БД; `app/admin/*` — клиентские страницы (форма, сессия). |
| **API** | `GET /api/catalog-items` — публичный список; `POST` — только для авторизованного пользователя, `multipart/form-data` (название + файл), сохранение в `public/uploads/` и путь `/uploads/...` в БД. |
| **Авторизация** | NextAuth (Credentials) + JWT-сессия; пользователи в таблице `User`; `middleware.ts` редиректит неавторизованных с `/admin` на `/admin/login`. |
| **БД** | Prisma ORM, PostgreSQL; таблицы `catalog_item`, `User`. |
| **Файлы** | Загрузки лежат в `public/uploads/`; в Docker том `catalog_uploads`, чтобы файлы переживали пересборку контейнера. |

Сборка приложения: `output: "standalone"` в `next.config.ts` — образ Docker копирует артефакт standalone и при старте выполняет `prisma migrate deploy`, затем `node server.js`.

---

## Требования

- **Node.js** 20+
- **pnpm** (рекомендуется)
- **Docker** (для Postgres и/или полного стека)

---

## Переменные окружения

Скопируй `.env.example` в `.env` и заполни значения.

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | Строка подключения PostgreSQL (`postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public`). |
| `AUTH_SECRET` | Секрет для подписи сессий NextAuth (в проде: `openssl rand -base64 32`). |
| `AUTH_URL` | Публичный URL приложения (например `http://localhost:3000` или ваш домен). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Используются **только сидом** для создания первого пользователя (см. ниже). |

В **Docker Compose** для сервиса `app` задаются `DATABASE_URL`, `AUTH_*`, опционально `ADMIN_*` для сида; том **`catalog_uploads`** монтируется в `/app/public/uploads`.

---

## Развёртывание: локальная разработка

1. Поднять только БД:

   ```bash
   docker compose up -d db
   ```

   Порт **5432** проброшен на хост — приложение на машине подключается к `localhost`.

2. Установить зависимости и применить миграции:

   ```bash
   pnpm install
   pnpm exec prisma migrate deploy
   ```

3. (Опционально) Заполнить данные и админа:

   ```bash
   pnpm db:seed
   ```

4. Запуск dev-сервера:

   ```bash
   pnpm dev
   ```

   Открыть [http://localhost:3000](http://localhost:3000), админка: [http://localhost:3000/admin/login](http://localhost:3000/admin/login) (учётная запись из сида по умолчанию — см. `.env.example`).

---

## Развёртывание: Docker Compose (приложение + БД)

Из каталога проекта:

```bash
docker compose up --build -d
```

- Образ приложения собирается по `Dockerfile` (multi-stage, pnpm, `next build` standalone).
- При старте контейнера `app`: **`prisma migrate deploy`**, затем **`node server.js`**.
- Задай надёжный **`AUTH_SECRET`** и при необходимости **`AUTH_URL`** в `.env` рядом с `docker-compose.yml` или через переменные окружения CI.

Первичное наполнение БД и пользователь-админ:

```bash
docker compose exec app node prisma/seed.js
```

(нужны `DATABASE_URL` внутри контейнера и при желании `ADMIN_EMAIL` / `ADMIN_PASSWORD` в `environment` compose.)

---

## Механизм миграций (Prisma)

1. **Источник правды** — файл `prisma/schema.prisma`. Любое изменение схемы должно отражаться в миграциях и быть закоммичено.

2. **Папка `prisma/migrations/`** — версионируемые SQL-файлы:
   - каждая миграция в подпапке с timestamp и именем, например `20260411120000_catalog_item`;
   - внутри — `migration.sql`;
   - `migration_lock.toml` фиксирует провайдера (`postgresql`).

3. **Два сценария:**

   | Команда | Когда |
   |---------|--------|
   | `pnpm db:migrate` (`prisma migrate dev`) | В разработке: создаёт новую миграцию из diff со схемой, применяет к локальной БД, перегенерирует клиент. |
   | `pnpm exec prisma migrate deploy` | CI/прод/Docker **старт**: **только применяет** уже существующие миграции, **не** создаёт новые файлы. |

4. **Порядок в проде:** собрать образ → при запуске контейнера выполнить **`migrate deploy`** (как в `Dockerfile` CMD) → поднять Node. Так БД всегда приводится к схеме, соответствующей коду.

5. **`prisma db push`** — обход миграций для быстрых экспериментов; для развёртывания с историей схемы используй миграции.

6. После изменения схемы локально: `pnpm db:migrate`, закоммить новую папку в `prisma/migrations/`, на серверах — только `migrate deploy`.

---

## Скрипты npm/pnpm

| Скрипт | Назначение |
|--------|------------|
| `pnpm dev` | Dev-сервер Next.js (Turbopack). |
| `pnpm build` / `pnpm start` | Прод-сборка и запуск. |
| `pnpm db:migrate` | Новая миграция в dev. |
| `pnpm exec prisma migrate deploy` | Применить миграции (prod/Docker). |
| `pnpm db:seed` | Сид: пользователь-админ + демо-позиции каталога. |
| `pnpm db:studio` | Prisma Studio к текущей БД. |
| `pnpm typecheck` / `pnpm lint` | Проверки TypeScript и ESLint. |
| `pnpm docker:up` | `docker compose up --build`. |

---

## Полезные ссылки

- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)
- [Auth.js (NextAuth)](https://authjs.dev/)
