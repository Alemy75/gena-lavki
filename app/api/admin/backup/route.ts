import { auth } from "@/auth";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { gzip as gzipCb } from "node:zlib";
import { NextResponse } from "next/server";

/**
 * Скачивание полного бэкапа из админки: один архив .tgz того же формата, что и
 * CLI-скрипт scripts/backup.sh (db.sql.gz + uploads.tgz + manifest.txt), поэтому
 * его можно восстановить тем же scripts/restore.sh.
 *
 * Доступ — только для авторизованного администратора (проверка auth() ниже);
 * middleware на /api/* не распространяется, поэтому проверка обязана быть здесь.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const gzip = promisify(gzipCb);

/** Запускает команду, копит stdout в Buffer; реджектит при ненулевом коде выхода. */
function run(cmd: string, args: string[], env?: NodeJS.ProcessEnv): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: env ?? process.env });
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
  });
}

/** Разбирает DATABASE_URL в параметры подключения + PGPASSWORD (минуя ?schema=…). */
function pgConn(): { host: string; port: string; user: string; db: string; env: NodeJS.ProcessEnv } {
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

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let work: string | undefined;
  try {
    const now = new Date();
    const { host, port, user, db, env } = pgConn();

    // 1) дамп БД (по сети к db:5432; пароль через PGPASSWORD)
    const sql = await run(
      "pg_dump",
      ["-h", host, "-p", port, "-U", user, "-d", db, "--clean", "--if-exists"],
      env,
    );
    const dbGz = await gzip(sql);

    // 2) загруженные файлы (tar каталога uploads; если его нет — пустой архив)
    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsRoot, { recursive: true });
    const uploadsTgz = await run("tar", ["-czf", "-", "-C", uploadsRoot, "."]);

    // 3) манифест
    const manifest = Buffer.from(
      `created: ${now.toISOString()}\nsource: admin-download\nby: ${session.user.email ?? "admin"}\n`,
      "utf8",
    );

    // 4) единый бандл — тот же формат, что и scripts/backup.sh
    work = await mkdtemp(path.join(tmpdir(), "gl-backup-"));
    await writeFile(path.join(work, "db.sql.gz"), dbGz);
    await writeFile(path.join(work, "uploads.tgz"), uploadsTgz);
    await writeFile(path.join(work, "manifest.txt"), manifest);
    const bundle = await run("tar", [
      "-czf",
      "-",
      "-C",
      work,
      "db.sql.gz",
      "uploads.tgz",
      "manifest.txt",
    ]);

    return new NextResponse(new Uint8Array(bundle), {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="gena-lavki_${stamp(now)}.tgz"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("backup failed", e);
    return NextResponse.json({ error: "Не удалось сделать бэкап" }, { status: 500 });
  } finally {
    if (work) {
      await rm(work, { recursive: true, force: true });
    }
  }
}
