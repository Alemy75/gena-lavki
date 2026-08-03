# Admin Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Восстановление сайта из бэкапа `.tgz` через админку: загрузка бандла на странице «Резервная копия», перезапись БД и uploads, авто-миграции.

**Architecture:** Новый `POST /api/admin/restore` выполняет всё внутри контейнера `app` (psql, prisma, tar уже в образе): стримит тело запроса на диск → валидирует бандл → заливает дамп одной транзакцией → `prisma migrate deploy` → перезаписывает uploads. Общие хелперы (`run`, `pgConn`) выносятся из backup route в `lib/`. UI — клиентская форма на странице бэкапа: файл + чекбокс-подтверждение + красная кнопка.

**Tech Stack:** Next.js 16 route handlers (nodejs runtime), NextAuth `auth()`, node:child_process/stream/zlib, psql (postgresql-client-16), prisma CLI, Tailwind 4.

Полный дизайн: [2026-08-03-admin-restore-design.md](../specs/2026-08-03-admin-restore-design.md).

## Global Constraints

- **Next.js этого репо может отличаться от привычного** — при любых сомнениях читать `node_modules/next/dist/docs/` (требование AGENTS.md). Route handlers: стандартные Web `Request`/`Response`, тело — `request.body` (web `ReadableStream`).
- Формат бандла: `.tgz` c `db.sql.gz`, `uploads.tgz`, `manifest.txt` — тот же, что у `GET /api/admin/backup` и `scripts/backup.sh`; `manifest.txt` не обязателен при восстановлении.
- Порядок восстановления строго: **БД → prisma migrate deploy → uploads** (как согласовано в спеке).
- psql всегда с `-v ON_ERROR_STOP=1 --single-transaction` — битый дамп откатывается целиком.
- Каждый route в `/api/admin/*` сам проверяет `auth()` — middleware на `/api/*` не распространяется.
- Комментарии в коде — на русском, в стиле существующего `app/api/admin/backup/route.ts`.
- Тестового фреймворка в проекте нет: после каждой задачи — `pnpm typecheck && pnpm lint`; поведение проверяется E2E через docker-стек (Task 4). В dev-режиме на Mac restore не заработает (нет psql/prisma на PATH) — это ожидаемо, проверяем только в Docker.
- Путь формы: `app/admin/(dashboard)/backup/restore-form.tsx` (колокация с страницей — паттерн репо; в спеке был указан условный `components/admin/`, уточнено здесь).
- Коммит после каждой задачи.

---

### Task 1: Общие хелперы `lib/run.ts` и `lib/pg-conn.ts`

Выносим `run()` и `pgConn()` из backup route, чтобы restore route их переиспользовал (DRY). `run()` получает поддержку `stdin` — restore будет лить дамп в psql потоком.

**Files:**
- Create: `lib/run.ts`
- Create: `lib/pg-conn.ts`
- Modify: `app/api/admin/backup/route.ts` (удалить локальные `run`/`pgConn`, импортировать из lib; сигнатура `run` меняется: третий аргумент теперь `{ env }`)

**Interfaces:**
- Produces: `run(cmd: string, args: string[], opts?: { env?: NodeJS.ProcessEnv; stdin?: Readable }): Promise<Buffer>` — резолвится stdout'ом при коде 0, реджектится с текстом stderr иначе; `opts.stdin` пайпится в stdin процесса.
- Produces: `pgConn(): { host: string; port: string; user: string; db: string; env: NodeJS.ProcessEnv }` — разбор `DATABASE_URL`, пароль в `env.PGPASSWORD`.

- [ ] **Step 1: Создать `lib/run.ts`**

```ts
import { spawn } from "node:child_process";
import type { Readable } from "node:stream";

/**
 * Запускает команду, копит stdout в Buffer; реджектит при ненулевом коде выхода
 * (в тексте ошибки — начало stderr). opts.stdin пайпится в stdin процесса —
 * так restore льёт дамп в psql потоком, не держа его в памяти.
 */
export function run(
  cmd: string,
  args: string[],
  opts: { env?: NodeJS.ProcessEnv; stdin?: Readable } = {},
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: opts.env ?? process.env });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout!.on("data", (c: Buffer) => out.push(c));
    child.stderr!.on("data", (c: Buffer) => err.push(c));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(out));
      } else {
        reject(
          new Error(
            `${cmd} завершился с кодом ${code}: ${Buffer.concat(err).toString("utf8").slice(0, 500)}`,
          ),
        );
      }
    });
    if (opts.stdin) {
      opts.stdin.on("error", reject);
      opts.stdin.pipe(child.stdin!);
    }
  });
}
```

- [ ] **Step 2: Создать `lib/pg-conn.ts`**

```ts
/** Разбирает DATABASE_URL в параметры подключения + PGPASSWORD (минуя ?schema=…). */
export function pgConn(): {
  host: string;
  port: string;
  user: string;
  db: string;
  env: NodeJS.ProcessEnv;
} {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL не задан");
  }
  const u = new URL(raw);
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: decodeURIComponent(u.username),
    db: u.pathname.replace(/^\//, "") || "catalog",
    env: { ...process.env, PGPASSWORD: decodeURIComponent(u.password) },
  };
}
```

- [ ] **Step 3: Перевести backup route на хелперы**

В `app/api/admin/backup/route.ts`:
- удалить локальные `run()` и `pgConn()` (и ставшие ненужными импорты `spawn` из `node:child_process`, `promisify` больше НЕ трогать — он для gzip);
- добавить импорты:

```ts
import { pgConn } from "@/lib/pg-conn";
import { run } from "@/lib/run";
```

- единственный вызов с env поменять с `run("pg_dump", [...], env)` на:

```ts
const sql = await run(
  "pg_dump",
  ["-h", host, "-p", port, "-U", user, "-d", db, "--clean", "--if-exists"],
  { env },
);
```

Вызовы `run("tar", ...)` без env остаются как есть (третий аргумент опционален).

- [ ] **Step 4: Проверить typecheck и lint**

Run: `pnpm typecheck && pnpm lint`
Expected: обе команды без ошибок.

- [ ] **Step 5: Commit**

```bash
git add lib/run.ts lib/pg-conn.ts app/api/admin/backup/route.ts
git commit -m "refactor: run() и pgConn() из backup route — в lib, run с поддержкой stdin"
```

---

### Task 2: `POST /api/admin/restore`

**Files:**
- Create: `app/api/admin/restore/route.ts`

**Interfaces:**
- Consumes: `run()` из `lib/run.ts`, `pgConn()` из `lib/pg-conn.ts` (сигнатуры — в Task 1), `auth()` из `@/auth`.
- Produces: `POST /api/admin/restore` — тело запроса: сырой `.tgz` (не multipart). Ответы: `200 {ok: true}`; `400/500 {error: string, step: "bundle"|"db"|"migrate"|"uploads"}`; `401 {error: "Unauthorized"}`. На это API опирается форма из Task 3.

- [ ] **Step 1: Создать `app/api/admin/restore/route.ts`**

```ts
import { auth } from "@/auth";
import { pgConn } from "@/lib/pg-conn";
import { run } from "@/lib/run";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { NextResponse } from "next/server";

/**
 * Восстановление из бандла .tgz того же формата, что отдаёт GET /api/admin/backup
 * и собирает scripts/backup.sh (db.sql.gz + uploads.tgz + manifest.txt).
 * ПЕРЕЗАПИСЫВАЕТ текущие данные. Порядок: БД одной транзакцией (битый дамп
 * откатывается целиком) → prisma migrate deploy (бэкап может быть от старой
 * схемы) → uploads (только после успеха БД).
 *
 * Работает только в Docker-образе: там есть psql (postgresql-client-16)
 * и глобальная prisma. Доступ — только для авторизованного администратора;
 * middleware на /api/* не распространяется, поэтому проверка обязана быть здесь.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(step: "bundle" | "db" | "migrate" | "uploads", message: string, status = 500) {
  return NextResponse.json({ error: message, step }, { status });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!request.body) {
    return fail("bundle", "Пустое тело запроса — приложите файл бэкапа", 400);
  }

  let work: string | undefined;
  try {
    work = await mkdtemp(path.join(tmpdir(), "gl-restore-"));

    // 1) тело запроса — на диск потоком, бандл не держим в памяти
    const bundle = path.join(work, "bundle.tgz");
    await pipeline(
      Readable.fromWeb(request.body as unknown as import("node:stream/web").ReadableStream),
      createWriteStream(bundle),
    );

    // 2) распаковка и валидация состава — до любых изменений данных
    const unpacked = path.join(work, "unpacked");
    await mkdir(unpacked);
    try {
      await run("tar", ["-xzf", bundle, "-C", unpacked]);
    } catch {
      return fail("bundle", "Файл не распаковался — это не .tgz-бандл бэкапа", 400);
    }
    const dbDump = path.join(unpacked, "db.sql.gz");
    const uploadsTgz = path.join(unpacked, "uploads.tgz");
    for (const [p, name] of [
      [dbDump, "db.sql.gz"],
      [uploadsTgz, "uploads.tgz"],
    ] as const) {
      const ok = await stat(p).then((s) => s.isFile()).catch(() => false);
      if (!ok) {
        return fail("bundle", `В архиве нет ${name} — это не бандл бэкапа`, 400);
      }
    }

    // 3) БД: дамп с --clean --if-exists, одной транзакцией
    const { host, port, user, db, env } = pgConn();
    try {
      await run(
        "psql",
        [
          "-h", host, "-p", port, "-U", user, "-d", db,
          "-v", "ON_ERROR_STOP=1", "--single-transaction", "--quiet",
        ],
        { env, stdin: createReadStream(dbDump).pipe(createGunzip()) },
      );
    } catch (e) {
      console.error("restore: psql failed", e);
      return fail("db", "Ошибка при заливке дампа — транзакция откатилась, данные не изменены");
    }

    // 4) миграции: догоняем старый бэкап до текущей схемы (та же команда, что в CMD образа)
    try {
      await run("prisma", ["migrate", "deploy"]);
    } catch (e) {
      console.error("restore: migrate deploy failed", e);
      return fail(
        "migrate",
        "БД восстановлена, но миграции не применились — схема может отставать от кода. " +
          "Повторите восстановление или перезапустите контейнер (миграции применятся при старте).",
      );
    }

    // 5) uploads: очистить и распаковать заново — в самом конце, после успеха БД
    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    try {
      await mkdir(uploadsRoot, { recursive: true });
      for (const entry of await readdir(uploadsRoot)) {
        await rm(path.join(uploadsRoot, entry), { recursive: true, force: true });
      }
      await run("tar", ["-xzf", uploadsTgz, "-C", uploadsRoot]);
    } catch (e) {
      console.error("restore: uploads failed", e);
      return fail(
        "uploads",
        "БД восстановлена, но файлы uploads восстановить не удалось. Повторите восстановление.",
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("restore failed", e);
    return fail("bundle", "Не удалось восстановить бэкап");
  } finally {
    if (work) {
      await rm(work, { recursive: true, force: true });
    }
  }
}
```

- [ ] **Step 2: Проверить typecheck и lint**

Run: `pnpm typecheck && pnpm lint`
Expected: без ошибок. Если TS ругается на `Readable.fromWeb` — проверить, что импорт `Readable` из `node:stream`, а каст типа — как в коде выше.

- [ ] **Step 3: Проверить 401 без авторизации (можно в dev, до Docker)**

Run:
```bash
pnpm dev &
sleep 5
curl -s -X POST http://localhost:3000/api/admin/restore -d 'x' | cat
kill %1
```
Expected: `{"error":"Unauthorized"}`.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/restore/route.ts
git commit -m "feat: POST /api/admin/restore — восстановление бэкапа из .tgz"
```

---

### Task 3: Форма восстановления на странице «Резервная копия»

**Files:**
- Create: `app/admin/(dashboard)/backup/restore-form.tsx`
- Modify: `app/admin/(dashboard)/backup/page.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/restore` (Task 2): сырой файл в body, `Content-Type: application/gzip`, `credentials: "include"`; ошибки в `{error}`.
- Produces: экспорт `RestoreForm` (без пропсов) — используется только страницей бэкапа.

- [ ] **Step 1: Создать `app/admin/(dashboard)/backup/restore-form.tsx`**

```tsx
"use client";

import { useState } from "react";

export function RestoreForm() {
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function restore() {
    if (!file) {
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/gzip" },
        body: file,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      setResult({
        ok: true,
        text: "Восстановление завершено: база данных и файлы заменены данными из бэкапа.",
      });
      setFile(null);
      setConfirmed(false);
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : "Ошибка восстановления" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-danger-border bg-danger-surface p-4">
      <h3 className="mb-2 text-base font-medium text-foreground">Восстановление из бэкапа</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Загрузите бандл <code>.tgz</code>, скачанный на этой странице (или собранный{" "}
        <code>scripts/backup.sh</code>). Текущие база данных и загруженные файлы будут{" "}
        <strong>безвозвратно перезаписаны</strong> — сначала скачайте свежий бэкап выше.
        Операция занимает до минуты, сайт в это время может быть недоступен.
      </p>

      <input
        type="file"
        accept=".tgz,application/gzip"
        disabled={busy}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="mb-3 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-muted-strong file:px-2 file:py-1"
      />

      <label className="mb-4 flex items-start gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={busy}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        Я понимаю, что текущие данные будут перезаписаны
      </label>

      <div>
        <button
          type="button"
          disabled={!file || !confirmed || busy}
          onClick={() => void restore()}
          className="inline-flex items-center rounded-lg bg-danger px-4 py-2 text-sm font-medium text-danger-foreground transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Восстанавливаю…" : "Восстановить из бэкапа"}
        </button>
      </div>

      {result ? (
        <p className={`mt-4 text-sm ${result.ok ? "text-foreground" : "text-danger"}`}>
          {result.text}
        </p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Подключить форму на страницу**

В `app/admin/(dashboard)/backup/page.tsx` добавить импорт и компонент после последнего абзаца (страница остаётся серверной):

```tsx
import { RestoreForm } from "./restore-form";
```

и перед закрывающим `</div>`:

```tsx
      <RestoreForm />
```

- [ ] **Step 3: Проверить typecheck и lint**

Run: `pnpm typecheck && pnpm lint`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(dashboard)/backup/restore-form.tsx" "app/admin/(dashboard)/backup/page.tsx"
git commit -m "feat: форма восстановления бэкапа на странице «Резервная копия»"
```

---

### Task 4: E2E-проверка через Docker-стек

Сценарии из раздела «Проверка» спеки. Всё — против локального dev-compose (`docker-compose.yml`), в котором образ идентичен проду.

**Files:** нет изменений кода (если проверка не выявит багов).

- [ ] **Step 1: Поднять стек и насеять данные**

```bash
docker compose up -d --build
until docker compose exec -T db pg_isready -U catalog -d catalog >/dev/null 2>&1; do sleep 2; done
docker compose exec -T app node prisma/seed.js
docker compose exec -T app sh -c 'echo marker-before > /app/public/uploads/restore-marker.txt'
```
Expected: сид отработал, маркер-файл создан.

- [ ] **Step 2: Скачать бэкап через админку**

В браузере: `http://localhost:3000/admin/login` → войти (`admin@example.com` / `admin123`) → «Резервная копия» → «Скачать бэкап (.tgz)». Файл сохраняется в Downloads.
Expected: скачался `gena-lavki_<ts>.tgz`; `tar -tzf` показывает `db.sql.gz`, `uploads.tgz`, `manifest.txt`.

- [ ] **Step 3: Испортить данные**

```bash
docker compose exec -T db psql -U catalog -d catalog -c 'DELETE FROM catalog_item;'
docker compose exec -T app sh -c 'rm /app/public/uploads/restore-marker.txt'
```
Expected: команды без ошибок; на сайте каталог пуст.

- [ ] **Step 4: Восстановить через форму**

На странице «Резервная копия»: выбрать скачанный бандл → чекбокс → «Восстановить из бэкапа». Кнопка должна быть неактивна, пока не выбраны и файл, и чекбокс.
Expected: через десятки секунд — сообщение об успехе; позиции каталога вернулись (проверить на сайте), маркер вернулся:
```bash
docker compose exec -T app cat /app/public/uploads/restore-marker.txt
```
Expected: `marker-before`.

- [ ] **Step 5: Битый файл — данные не тронуты**

Подготовить и залить через форму два файла:
```bash
echo "not a tgz" > /tmp/broken.txt
mkdir -p /tmp/fake && echo x > /tmp/fake/readme.txt && tar -czf /tmp/fake.tgz -C /tmp/fake readme.txt
```
(в поле выбора файла снять фильтр типов или переименовать `broken.txt` в `broken.tgz`).
Expected: оба раза — читаемая ошибка («не распаковался» / «нет db.sql.gz»); каталог на сайте цел:
```bash
docker compose exec -T db psql -U catalog -d catalog -c 'SELECT count(*) FROM catalog_item;'
```
Expected: count тот же, что после восстановления в Step 4.

- [ ] **Step 6: Совместимость со старым бэкапом (авто-миграции)**

Честно имитировать бэкап «от старой схемы» нельзя удалением строки из `_prisma_migrations` (migrate deploy попытается повторно применить миграцию поверх уже существующей схемы и упадёт) — настоящий старый бэкап содержит и старую схему, и старую таблицу миграций. Поэтому проверяем два факта: цепочка с migrate deploy не ломает свежий дамп (уже проверено Step 4) и команда идемпотентна и доступна в контейнере:
```bash
docker compose exec -T app prisma migrate deploy
```
Expected: `No pending migrations to apply.` — команда доступна и отрабатывает внутри контейнера.

- [ ] **Step 7: Зафиксировать результат**

Если правок кода не было — коммитов нет. Если проверка выявила баги — исправить, прогнать Step 1–6 заново, закоммитить исправления:
```bash
git add -A && git commit -m "fix: правки restore по итогам E2E-проверки"
```
