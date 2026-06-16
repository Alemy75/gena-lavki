import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

/**
 * Отдаёт runtime-загруженные файлы из public/uploads/.
 * Next.js standalone не видит файлы, появившиеся в public/ после build,
 * поэтому нужен серверный handler. Запрос `/uploads/<file>` рерайтится
 * сюда (next.config.ts → beforeFiles).
 */

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

type RouteContext = { params: Promise<{ file: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { file } = await context.params;

  // имя файла строго ограничено — никаких / или .., чтобы исключить выход за uploads
  if (!/^[a-zA-Z0-9._-]+$/.test(file) || file.startsWith(".")) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadsRoot, file);
  if (!filePath.startsWith(uploadsRoot + path.sep)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(file).toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
