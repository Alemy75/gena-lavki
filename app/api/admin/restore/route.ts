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
