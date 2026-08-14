# Тексты баннеров главной и айдентика — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вынести тексты обоих баннеров главной, логотип в шапке и favicon из кода в админку.

**Architecture:** Тексты баннеров — новая singleton-модель `HomeContent` + роут `/api/home-content` + страница `/admin/home`; компоненты баннеров получают текст пропсами от серверной `app/page.tsx`. Логотип и favicon — две колонки в существующей `SiteSettings`, загрузка через новый роут `/api/site-settings/images` поверх существующего `savePublicUpload`, редактирование на странице «Данные компании».

**Tech Stack:** Next.js 16.2.3 (App Router), React 19, Prisma 6 + PostgreSQL, NextAuth 5 beta, Tailwind 4.

**Спека:** [docs/superpowers/specs/2026-08-14-home-banners-and-branding-design.md](../specs/2026-08-14-home-banners-and-branding-design.md)

## Global Constraints

- **В проекте нет тест-раннера.** Нет ни vitest/jest, ни единого `*.test.*`. Добавление фреймворка — отдельное решение, в этот план не входит. Верификация каждой задачи: `pnpm typecheck`, `pnpm lint` и конкретные проверки через `curl`/браузер против локального стека. Не притворяться, что тесты есть.
- **Локальный стек для проверок:** `docker compose up -d db`, затем `pnpm dev` (порт 3000). Миграции локально — `pnpm db:migrate`, папку миграции коммитить.
- **Next здесь не тот, что в обучающих данных** (требование AGENTS.md): перед правкой файловых конвенций и метаданных сверяться с `node_modules/next/dist/docs/`. Релевантное уже проверено: `metadata.icons` в `01-app/03-api-reference/04-functions/generate-metadata.md` (строка 581), файловые конвенции иконок — `01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md`.
- **Все страницы `force-dynamic`** — ревалидация кеша не нужна, правки видны сразу.
- **Тексты интерфейса и комментарии — по-русски**, как во всём проекте.
- **Картинки — нативный `<img>`** с комментарием `{/* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */}`; это принятая в проекте практика.
- **Сообщения коммитов — по-русски**, префиксы `feat:` / `fix:` / `docs:` как в истории.
- **Правило дефолтов:** заголовки и абзацы при пустом значении подменяются константой; пункты доставки при пустом значении не рендерятся вовсе.

---

### Task 1: Модель `HomeContent`, чтение с дефолтами, сид

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_home_content/migration.sql` (генерирует Prisma)
- Create: `lib/home-content.ts`
- Modify: `prisma/seed.js`

**Interfaces:**
- Consumes: `prisma` из `lib/prisma.ts`, паттерн `cache()` из `lib/site.ts`.
- Produces: `HOME_DEFAULTS` (объект с полями `heroTitle`, `heroText`, `deliveryTitle`, `deliveryText`, `deliveryFeatures` — все `string`), `parseFeatures(raw: string): string[]`, `type HomeContent = { heroTitle: string; heroText: string; deliveryTitle: string; deliveryText: string; deliveryFeatures: string[] }`, `getHomeContent(): Promise<HomeContent>`.

- [ ] **Step 1: Добавить модель в схему**

В конец `prisma/schema.prisma`:

```prisma
/// Тексты баннеров главной. Singleton: всегда одна строка с id = 1.
model HomeContent {
  id               Int    @id @default(1)
  heroTitle        String @default("")
  heroText         String @default("")
  deliveryTitle    String @default("")
  deliveryText     String @default("")
  deliveryFeatures String @default("")

  @@map("home_content")
}
```

- [ ] **Step 2: Создать миграцию**

```bash
docker compose up -d db && pnpm db:migrate --name home_content
```

Ожидается: создана папка `prisma/migrations/<timestamp>_home_content/` с `migration.sql`, клиент Prisma перегенерирован.

- [ ] **Step 3: Написать `lib/home-content.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { cache } from "react";

/** Тексты баннеров по умолчанию — ровно то, что было захардкожено в компонентах. */
export const HOME_DEFAULTS = {
  heroTitle: "Лавки и садовая мебель ручной работы",
  heroText:
    "Делаем уличные лавки, скамьи и мебель для сада и дачи. Подберём размер, цвет и форму под ваше место — напишите нам, обсудим заказ.",
  deliveryTitle: "Привезём заказ к вам",
  deliveryText:
    "Отправляем по всей России через транспортные компании. Точную стоимость и сроки рассчитываем индивидуально под каждый заказ.",
  deliveryFeatures: [
    "По всей России — СДЭК, Деловые Линии, ПЭК",
    "Самовывоз со склада в Москве — бесплатно",
    "Сроки и стоимость рассчитаем под ваш заказ",
  ].join("\n"),
};

export type HomeContent = {
  heroTitle: string;
  heroText: string;
  deliveryTitle: string;
  deliveryText: string;
  deliveryFeatures: string[];
};

/** Строка = пункт. Пустые строки отбрасываем, иначе в списке появятся пустые галочки. */
export function parseFeatures(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

const getRow = cache(() => prisma.homeContent.findUnique({ where: { id: 1 } }));

/**
 * Тексты баннеров для главной. Заголовки и абзацы при пустом значении
 * подменяются дефолтом: пустой h1 ломает вёрстку и SEO. Пункты доставки —
 * наоборот: пустое поле означает «списка нет», это осознанный выбор владельца.
 * Если строки в БД нет вовсе (свежая база без сида), возвращаются все дефолты.
 */
export async function getHomeContent(): Promise<HomeContent> {
  const row = await getRow();
  if (!row) {
    return {
      heroTitle: HOME_DEFAULTS.heroTitle,
      heroText: HOME_DEFAULTS.heroText,
      deliveryTitle: HOME_DEFAULTS.deliveryTitle,
      deliveryText: HOME_DEFAULTS.deliveryText,
      deliveryFeatures: parseFeatures(HOME_DEFAULTS.deliveryFeatures),
    };
  }
  const pick = (value: string, fallback: string) =>
    value.trim() === "" ? fallback : value;
  return {
    heroTitle: pick(row.heroTitle, HOME_DEFAULTS.heroTitle),
    heroText: pick(row.heroText, HOME_DEFAULTS.heroText),
    deliveryTitle: pick(row.deliveryTitle, HOME_DEFAULTS.deliveryTitle),
    deliveryText: pick(row.deliveryText, HOME_DEFAULTS.deliveryText),
    deliveryFeatures: parseFeatures(row.deliveryFeatures),
  };
}
```

- [ ] **Step 4: Заполнить строку в сиде**

В `prisma/seed.js` после блока настроек сайта (рядом с `settingsRow`), тем же идемпотентным стилем «не затираем реальные данные»:

```js
  // Тексты баннеров главной — только если строки ещё нет (не затираем правки из админки).
  const homeRow = await prisma.homeContent.findUnique({ where: { id: 1 } });
  if (!homeRow) {
    await prisma.homeContent.create({
      data: {
        id: 1,
        heroTitle: "Лавки и садовая мебель ручной работы",
        heroText:
          "Делаем уличные лавки, скамьи и мебель для сада и дачи. Подберём размер, цвет и форму под ваше место — напишите нам, обсудим заказ.",
        deliveryTitle: "Привезём заказ к вам",
        deliveryText:
          "Отправляем по всей России через транспортные компании. Точную стоимость и сроки рассчитываем индивидуально под каждый заказ.",
        deliveryFeatures: [
          "По всей России — СДЭК, Деловые Линии, ПЭК",
          "Самовывоз со склада в Москве — бесплатно",
          "Сроки и стоимость рассчитаем под ваш заказ",
        ].join("\n"),
      },
    });
    console.log("Seeded home content");
  }
```

- [ ] **Step 5: Проверить**

```bash
pnpm typecheck && pnpm lint && pnpm db:seed
```

Ожидается: обе проверки чистые, в выводе сида строка `Seeded home content`. Повторный `pnpm db:seed` эту строку уже не печатает — идемпотентность.

- [ ] **Step 6: Коммит**

```bash
git add prisma/schema.prisma prisma/migrations lib/home-content.ts prisma/seed.js
git commit -m "feat: модель home_content и чтение текстов баннеров с дефолтами"
```

---

### Task 2: Роут `/api/home-content`

**Files:**
- Create: `app/api/home-content/route.ts`

**Interfaces:**
- Consumes: `auth()` из `@/auth`, `prisma`, поля модели `HomeContent` из Task 1.
- Produces: `GET /api/home-content` → JSON строки со всеми полями; `PATCH /api/home-content` → обновлённый JSON, 401 без сессии, 400 на невалидный JSON и на пустой набор полей.

- [ ] **Step 1: Написать роут**

Полностью по образцу `app/api/site-settings/route.ts` — та же структура `ensure*`, та же обработка ошибок:

```ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const FIELDS = [
  "heroTitle",
  "heroText",
  "deliveryTitle",
  "deliveryText",
  "deliveryFeatures",
] as const;

async function ensureHomeContent() {
  let row = await prisma.homeContent.findUnique({ where: { id: 1 } });
  if (!row) {
    row = await prisma.homeContent.create({ data: { id: 1 } });
  }
  return row;
}

export async function GET() {
  try {
    const row = await ensureHomeContent();
    return NextResponse.json(row);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load home content" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  for (const field of FIELDS) {
    if (field in body) {
      data[field] = String((body as Record<string, unknown>)[field] ?? "");
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  try {
    await ensureHomeContent();
    const row = await prisma.homeContent.update({ where: { id: 1 }, data });
    return NextResponse.json(row);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Проверить**

При запущенном `pnpm dev`:

```bash
curl -s localhost:3000/api/home-content | head -c 200
```

Ожидается: JSON с полями `heroTitle`, `heroText`, `deliveryTitle`, `deliveryText`, `deliveryFeatures`.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH localhost:3000/api/home-content -H "Content-Type: application/json" -d '{"heroTitle":"взлом"}'
```

Ожидается: `401` — без сессии правка запрещена.

```bash
curl -s -X PATCH localhost:3000/api/home-content -H "Content-Type: application/json" -d 'не json'
```

Ожидается: `401` (проверка сессии идёт раньше разбора тела — так же ведёт себя существующий `site-settings`).

- [ ] **Step 3: Коммит**

```bash
git add app/api/home-content/route.ts
git commit -m "feat: GET/PATCH /api/home-content"
```

---

### Task 3: Баннеры получают текст пропсами

**Files:**
- Modify: `components/hero-banner.tsx`
- Modify: `components/delivery-banner.tsx:3-7` (удалить константу `FEATURES`), `:43-71` (пропсы и условный список)
- Modify: `app/page.tsx:67-69`

**Interfaces:**
- Consumes: `getHomeContent()` из Task 1.
- Produces: `HeroBanner({ title, text }: { title: string; text: string })`, `DeliveryBanner({ title, text, features }: { title: string; text: string; features: string[] })`.

- [ ] **Step 1: Пропсы в `HeroBanner`**

Заменить сигнатуру и два текстовых узла, всё остальное (картинки, кнопка, классы) не трогать:

```tsx
export function HeroBanner({ title, text }: { title: string; text: string }) {
  const { open } = useContactModal();
```

```tsx
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base md:mx-0">
          {text}
        </p>
```

- [ ] **Step 2: Пропсы в `DeliveryBanner`**

Удалить константу `FEATURES` целиком (строки 3–7). Заменить сигнатуру и разметку заголовка, абзаца и списка:

```tsx
/** Большой баннер «Доставка» на главной — заголовок, преимущества, CTA на /info/delivery. */
export function DeliveryBanner({
  title,
  text,
  features,
}: {
  title: string;
  text: string;
  features: string[];
}) {
```

```tsx
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {text}
          </p>

          {features.length > 0 ? (
            <ul className="mt-4 space-y-1.5 text-sm text-foreground-soft">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckIcon />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          ) : null}
```

- [ ] **Step 3: Передать данные из `app/page.tsx`**

Добавить импорт и вызов, затем пропсы в местах рендера:

```tsx
import { getHomeContent } from "@/lib/home-content";
```

```tsx
  const home = await getHomeContent();
```

```tsx
      hero={<HeroBanner title={home.heroTitle} text={home.heroText} />}
```

```tsx
      bottom={
        <DeliveryBanner
          title={home.deliveryTitle}
          text={home.deliveryText}
          features={home.deliveryFeatures}
        />
      }
```

Вызов `getHomeContent()` поставить рядом с существующими запросами в `Home`, до `return`.

- [ ] **Step 4: Проверить**

```bash
pnpm typecheck && pnpm lint
```

```bash
curl -s localhost:3000/ | grep -c "Лавки и садовая мебель ручной работы"
```

Ожидается: не ноль — заголовок из БД (или дефолт) виден в разметке. Затем изменить `heroTitle` напрямую в БД и убедиться, что страница отдаёт новое значение:

```bash
docker compose exec -T db psql -U catalog -d catalog -c "UPDATE home_content SET \"heroTitle\" = 'Проверка баннера' WHERE id = 1;"
curl -s localhost:3000/ | grep -c "Проверка баннера"
```

Ожидается: не ноль. После проверки вернуть значение сидом: `pnpm db:seed` не перезапишет существующую строку, поэтому вернуть через тот же `UPDATE`.

- [ ] **Step 5: Коммит**

```bash
git add components/hero-banner.tsx components/delivery-banner.tsx app/page.tsx
git commit -m "feat: тексты баннеров главной приходят из БД пропсами"
```

---

### Task 4: Страница `/admin/home`

**Files:**
- Create: `app/admin/(dashboard)/home/page.tsx`
- Modify: `app/admin/(dashboard)/admin-shell.tsx:7-12` (пункт `NAV`)

**Interfaces:**
- Consumes: `GET`/`PATCH /api/home-content` из Task 2.
- Produces: страница по адресу `/admin/home`, пункт меню «Главная».

- [ ] **Step 1: Добавить пункт меню**

В массив `NAV` в `admin-shell.tsx`, первым (главная страница сайта — логично в начале):

```tsx
const NAV = [
  { href: "/admin/home", label: "Главная" },
  { href: "/admin/categories", label: "Категории" },
  { href: "/admin/items", label: "Позиции" },
  { href: "/admin/pages", label: "Страницы" },
  { href: "/admin/company", label: "Данные компании" },
  { href: "/admin/backup", label: "Бэкап" },
];
```

- [ ] **Step 2: Написать страницу**

Структура и классы — по образцу `app/admin/(dashboard)/company/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";

type HomeContentDto = {
  heroTitle: string;
  heroText: string;
  deliveryTitle: string;
  deliveryText: string;
  deliveryFeatures: string;
};

export default function AdminHomePage() {
  const [form, setForm] = useState<HomeContentDto>({
    heroTitle: "",
    heroText: "",
    deliveryTitle: "",
    deliveryText: "",
    deliveryFeatures: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/home-content");
      if (!res.ok) {
        throw new Error("Не удалось загрузить тексты");
      }
      const data = (await res.json()) as Partial<HomeContentDto>;
      setForm({
        heroTitle: data.heroTitle ?? "",
        heroText: data.heroText ?? "",
        deliveryTitle: data.deliveryTitle ?? "",
        deliveryText: data.deliveryText ?? "",
        deliveryFeatures: data.deliveryFeatures ?? "",
      });
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка загрузки",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function field(key: keyof HomeContentDto) {
    return {
      value: form[key],
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/home-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      setMessage({ type: "ok", text: "Тексты баннеров сохранены" });
      await load();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка сохранения",
      });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm";

  return (
    <div>
      <h2 className="mb-2 text-lg font-medium text-foreground">Главная страница</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Тексты двух баннеров на главной. Если оставить заголовок или описание
        пустым, покажется текст по умолчанию. Пункты доставки — по одному на
        строку; уберите все строки, и список исчезнет.
      </p>

      {message ? (
        <p
          className={
            message.type === "ok"
              ? "mb-4 text-sm text-success"
              : "mb-4 text-sm text-danger"
          }
          role="alert"
        >
          {message.text}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка текстов…</p>
      ) : (
        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-2xl border border-border bg-surface p-6 dark:shadow-sm"
        >
          <div className="space-y-4">
            <h3 className="text-base font-medium text-foreground">Главный баннер</h3>
            <div>
              <label htmlFor="hero-title" className="mb-1 block text-sm font-medium">
                Заголовок
              </label>
              <input id="hero-title" type="text" className={inputClass} {...field("heroTitle")} />
            </div>
            <div>
              <label htmlFor="hero-text" className="mb-1 block text-sm font-medium">
                Описание
              </label>
              <textarea
                id="hero-text"
                rows={3}
                className={`${inputClass} resize-y`}
                {...field("heroText")}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-medium text-foreground">Баннер доставки</h3>
            <div>
              <label htmlFor="delivery-title" className="mb-1 block text-sm font-medium">
                Заголовок
              </label>
              <input
                id="delivery-title"
                type="text"
                className={inputClass}
                {...field("deliveryTitle")}
              />
            </div>
            <div>
              <label htmlFor="delivery-text" className="mb-1 block text-sm font-medium">
                Описание
              </label>
              <textarea
                id="delivery-text"
                rows={3}
                className={`${inputClass} resize-y`}
                {...field("deliveryText")}
              />
            </div>
            <div>
              <label
                htmlFor="delivery-features"
                className="mb-1 block text-sm font-medium"
              >
                Пункты списка — по одному на строку
              </label>
              <textarea
                id="delivery-features"
                rows={5}
                className={`${inputClass} resize-y`}
                {...field("deliveryFeatures")}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить тексты"}
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Проверить**

```bash
pnpm typecheck && pnpm lint
```

Затем вручную в браузере: войти в `/admin/login`, открыть `/admin/home`, поменять заголовок главного баннера, сохранить — появляется «Тексты баннеров сохранены»; открыть `/` — новый заголовок на месте. Стереть заголовок, сохранить, обновить `/` — виден дефолт «Лавки и садовая мебель ручной работы». Стереть все строки пунктов, сохранить — на главной список галочек исчез, баннер не поехал.

- [ ] **Step 4: Коммит**

```bash
git add "app/admin/(dashboard)/home/page.tsx" "app/admin/(dashboard)/admin-shell.tsx"
git commit -m "feat: страница «Главная» в админке — тексты баннеров"
```

---

### Task 5: Колонки `logo`/`favicon`, поддержка `.ico`, роут загрузки

**Files:**
- Modify: `prisma/schema.prisma` (модель `SiteSettings`)
- Create: `prisma/migrations/<timestamp>_site_logo_favicon/migration.sql` (генерирует Prisma)
- Modify: `lib/save-public-upload.ts:6-20` (`ALLOWED_TYPES`, `EXT`)
- Modify: `app/api/files/[file]/route.ts:13-20` (`MIME`)
- Create: `app/api/site-settings/images/route.ts`

**Interfaces:**
- Consumes: `savePublicUpload(file: File)` → `{ ok: true; publicPath: string } | { ok: false; error: string }`; `auth()`.
- Produces: `POST /api/site-settings/images` (multipart: `field` = `logo` | `favicon`, `file`) → обновлённый JSON настроек; `DELETE /api/site-settings/images?field=logo` → обновлённый JSON; 400 на неизвестное `field`, 401 без сессии.

- [ ] **Step 1: Колонки в схеме**

В модель `SiteSettings`, после `address`:

```prisma
  /// Публичные пути /uploads/... либо пустая строка
  logo     String @default("")
  favicon  String @default("")
```

- [ ] **Step 2: Создать миграцию**

```bash
pnpm db:migrate --name site_logo_favicon
```

Ожидается: новая папка в `prisma/migrations/`, клиент перегенерирован.

- [ ] **Step 3: Разрешить `.ico` при загрузке**

В `lib/save-public-upload.ts` дописать в `ALLOWED_TYPES` и `EXT`:

```ts
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
};
```

Заодно поправить текст ошибки, иначе он врёт про допустимые форматы:

```ts
    return {
      ok: false,
      error: "Допустимы JPEG, PNG, WebP, GIF, SVG, ICO",
    };
```

- [ ] **Step 4: Отдавать `.ico` с верным типом**

В `app/api/files/[file]/route.ts` в таблицу `MIME`:

```ts
  ".ico": "image/x-icon",
```

- [ ] **Step 5: Написать роут загрузки**

```ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { savePublicUpload } from "@/lib/save-public-upload";
import { NextResponse } from "next/server";

const IMAGE_FIELDS = new Set(["logo", "favicon"]);

async function ensureSettings() {
  let row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!row) {
    row = await prisma.siteSettings.create({ data: { id: 1 } });
  }
  return row;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const field = String(formData.get("field") ?? "");
  if (!IMAGE_FIELDS.has(field)) {
    return NextResponse.json({ error: "Неизвестное поле" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Файл не выбран" }, { status: 400 });
  }

  const saved = await savePublicUpload(file);
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: 400 });
  }

  try {
    await ensureSettings();
    const row = await prisma.siteSettings.update({
      where: { id: 1 },
      data: { [field]: saved.publicPath },
    });
    return NextResponse.json(row);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const field = new URL(request.url).searchParams.get("field") ?? "";
  if (!IMAGE_FIELDS.has(field)) {
    return NextResponse.json({ error: "Неизвестное поле" }, { status: 400 });
  }

  try {
    await ensureSettings();
    // Файл на диске не удаляем: путь пришёл из БД, а удаление по нему —
    // лишний риск при ничтожном весе картинок. Так же ведут себя иконки соцсетей.
    const row = await prisma.siteSettings.update({
      where: { id: 1 },
      data: { [field]: "" },
    });
    return NextResponse.json(row);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Проверить**

```bash
pnpm typecheck && pnpm lint
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/site-settings/images -F field=logo -F file=@public/hero-bench.webp
```

Ожидается: `401` — без сессии загрузка запрещена.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE "localhost:3000/api/site-settings/images?field=logo"
```

Ожидается: `401`.

- [ ] **Step 7: Коммит**

```bash
git add prisma/schema.prisma prisma/migrations lib/save-public-upload.ts "app/api/files/[file]/route.ts" app/api/site-settings/images/route.ts
git commit -m "feat: колонки logo/favicon и загрузка картинок айдентики"
```

---

### Task 6: Логотип в шапке

**Files:**
- Modify: `app/layout.tsx` — блок чтения настроек в `RootLayout` (рядом с `const phone = …`) и `<Link href="/">` внутри `<header>`

**Interfaces:**
- Consumes: `getSiteSettings()` из `lib/site.ts` — теперь возвращает и `logo`.
- Produces: шапка с квадратным логотипом слева от названия; при пустом `logo` разметка как сейчас.

- [ ] **Step 1: Достать `logo` из настроек**

Рядом с существующими `phone`/`email`/`address` в `RootLayout`:

```tsx
  const logo = settings?.logo?.trim() ?? "";
```

- [ ] **Step 2: Отрисовать логотип в ссылке**

Заменить содержимое `<Link href="/">`:

```tsx
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight"
            >
              {logo ? (
                /* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */
                <img
                  src={logo}
                  alt=""
                  aria-hidden="true"
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded object-cover"
                />
              ) : null}
              {siteName}
            </Link>
```

`alt=""` и `aria-hidden` — логотип декоративен, название рядом уже озвучивает ссылку, иначе скринридер прочитает её дважды.

- [ ] **Step 3: Проверить**

```bash
pnpm typecheck && pnpm lint
```

Подставить путь напрямую в БД и убедиться, что картинка появилась:

```bash
docker compose exec -T db psql -U catalog -d catalog -c "UPDATE site_settings SET logo = '/icons/whatsapp.svg' WHERE id = 1;"
curl -s localhost:3000/ | grep -c 'src="/icons/whatsapp.svg"'
```

Ожидается: не ноль. Затем очистить и проверить, что тега нет:

```bash
docker compose exec -T db psql -U catalog -d catalog -c "UPDATE site_settings SET logo = '' WHERE id = 1;"
curl -s localhost:3000/ | grep -c 'src="/icons/whatsapp.svg"'
```

Ожидается: `0`.

- [ ] **Step 4: Коммит**

```bash
git add app/layout.tsx
git commit -m "feat: логотип из настроек в шапке сайта"
```

---

### Task 7: Favicon из настроек

**Files:**
- Delete: `app/favicon.ico` (переезжает в `public/`)
- Create: `public/favicon-default.ico` (тот же файл)
- Modify: `app/layout.tsx` (`generateMetadata`)

**Interfaces:**
- Consumes: `getSiteSettings()`.
- Produces: ровно один `<link rel="icon">` в `<head>` — загруженный favicon либо `/favicon-default.ico`.

- [ ] **Step 1: Перенести файл**

```bash
git mv app/favicon.ico public/favicon-default.ico
```

Причина переноса, а не удаления: `app/favicon.ico` подхватывается файловой конвенцией Next и сам вставляет `<link rel="icon">`; вместе с нашим тегом из `metadata.icons` в `<head>` оказались бы два конкурирующих тега. В `public/` файл остаётся обычной статикой и служит дефолтом.

- [ ] **Step 2: Задать `icons` в `generateMetadata`**

В `app/layout.tsx`, в `generateMetadata`, до `return`:

```tsx
  const settings = await getSiteSettings();
  const favicon = settings?.favicon?.trim() || "/favicon-default.ico";
```

и в возвращаемый объект метаданных, рядом с `title`:

```tsx
    icons: { icon: favicon },
```

`getSiteSettings` обёрнут в `cache()`, поэтому дополнительного запроса к БД не будет — `RootLayout` читает те же настройки.

- [ ] **Step 3: Проверить**

```bash
pnpm typecheck && pnpm lint
```

```bash
curl -s localhost:3000/ | grep -o 'rel="icon"[^>]*' | wc -l
```

Ожидается: `1` — ровно один тег, дублей от файловой конвенции нет.

```bash
curl -s localhost:3000/ | grep -o 'href="[^"]*favicon[^"]*"'
```

Ожидается: `href="/favicon-default.ico"`. Затем подставить свой путь и повторить:

```bash
docker compose exec -T db psql -U catalog -d catalog -c "UPDATE site_settings SET favicon = '/icons/whatsapp.svg' WHERE id = 1;"
curl -s localhost:3000/ | grep -o 'rel="icon"[^>]*'
```

Ожидается: один тег, в `href` — `/icons/whatsapp.svg`. После проверки вернуть пустое значение.

```bash
curl -sI localhost:3000/favicon-default.ico | head -2
```

Ожидается: `200` — дефолтный файл раздаётся из `public/`.

- [ ] **Step 4: Коммит**

```bash
git add app/layout.tsx app/favicon.ico public/favicon-default.ico
git commit -m "feat: favicon из настроек сайта с дефолтным файлом"
```

---

### Task 8: Загрузка логотипа и favicon в админке

**Files:**
- Modify: `app/admin/(dashboard)/company/page.tsx` (состояние, загрузчик, разметка)

**Interfaces:**
- Consumes: `POST`/`DELETE /api/site-settings/images` из Task 5; `GET /api/site-settings` теперь отдаёт `logo` и `favicon`.
- Produces: секция «Логотип и иконка сайта» на странице «Данные компании».

- [ ] **Step 1: Хранить пути в состоянии**

К существующим `useState` в `AdminCompanyPage`:

```tsx
  const [logo, setLogo] = useState("");
  const [favicon, setFavicon] = useState("");
  const [imageSaving, setImageSaving] = useState(false);
```

В `loadSiteSettings` расширить тип ответа и заполнение:

```tsx
      const data = (await res.json()) as {
        siteName: string;
        phone: string;
        email: string;
        address: string;
        logo: string;
        favicon: string;
      };
      setSiteName(data.siteName ?? "");
      setPhone(data.phone ?? "");
      setEmail(data.email ?? "");
      setAddress(data.address ?? "");
      setLogo(data.logo ?? "");
      setFavicon(data.favicon ?? "");
```

- [ ] **Step 2: Обработчики загрузки и удаления**

Рядом с `handleSaveSiteSettings`:

```tsx
  async function handleImageUpload(field: "logo" | "favicon", file: File) {
    setMessage(null);
    setImageSaving(true);
    try {
      const fd = new FormData();
      fd.append("field", field);
      fd.append("file", file);
      const res = await fetch("/api/site-settings/images", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      setMessage({
        type: "ok",
        text: field === "logo" ? "Логотип обновлён" : "Иконка сайта обновлена",
      });
      await loadSiteSettings();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка загрузки",
      });
    } finally {
      setImageSaving(false);
    }
  }

  async function handleImageDelete(field: "logo" | "favicon") {
    setMessage(null);
    setImageSaving(true);
    try {
      const res = await fetch(`/api/site-settings/images?field=${field}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      setMessage({ type: "ok", text: "Картинка убрана" });
      await loadSiteSettings();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка удаления",
      });
    } finally {
      setImageSaving(false);
    }
  }
```

- [ ] **Step 3: Разметка секции**

После формы контактов, до заголовка «Соцсети»:

```tsx
      <h3 className="mb-3 text-base font-medium text-foreground">
        Логотип и иконка сайта
      </h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Логотип — квадратная картинка слева от названия в шапке. Иконка сайта
        (favicon) видна на вкладке браузера. PNG или SVG, квадрат, от 64×64, до 5 МБ.
      </p>
      <div className="mb-8 grid gap-4 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 dark:shadow-sm">
        {(
          [
            { field: "logo" as const, label: "Логотип", value: logo },
            { field: "favicon" as const, label: "Иконка сайта", value: favicon },
          ]
        ).map(({ field, label, value }) => (
          <div key={field} className="min-w-0">
            <span className="mb-2 block text-sm font-medium">{label}</span>
            <div className="flex items-center gap-3">
              {value ? (
                /* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */
                <img
                  src={value}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded border border-border object-cover"
                />
              ) : (
                <span className="text-sm text-muted-foreground">не задан</span>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico,.svg"
                disabled={imageSaving}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleImageUpload(field, file);
                  }
                  e.target.value = "";
                }}
                className="min-w-0 flex-1 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted-strong file:px-3 file:py-1.5"
              />
              {value ? (
                <button
                  type="button"
                  disabled={imageSaving}
                  onClick={() => void handleImageDelete(field)}
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Убрать
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
```

`e.target.value = ""` после выбора — иначе повторная загрузка того же файла не вызовет `onChange`.

- [ ] **Step 4: Проверить**

```bash
pnpm typecheck && pnpm lint
```

Вручную в браузере на `/admin/company`: загрузить PNG в «Логотип» — появляется превью и сообщение «Логотип обновлён», в шапке слева от названия виден квадрат; нажать «Убрать» — шапка вернулась к тексту. Загрузить `.ico` в «Иконка сайта» — на вкладке браузера сменилась иконка (при необходимости обновить страницу с `Cmd+Shift+R`). Попробовать файл больше 5 МБ — сообщение «Файл больше 5 МБ», настройки не изменились.

- [ ] **Step 5: Коммит**

```bash
git add "app/admin/(dashboard)/company/page.tsx"
git commit -m "feat: загрузка логотипа и favicon в админке"
```

---

## Проверка целиком перед PR

- [ ] `pnpm typecheck && pnpm lint` — чисто
- [ ] `pnpm build` — сборка проходит (миграции и Prisma-клиент в порядке)
- [ ] Свежая база: `docker compose down -v && docker compose up -d db && pnpm exec prisma migrate deploy && pnpm db:seed` — главная отдаёт дефолтные тексты, favicon дефолтный, шапка без логотипа
- [ ] Все проверки из раздела «Проверка» спеки пройдены
