import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

/**
 * Единый слой хранилища загруженных файлов.
 * На Vercel (есть BLOB_READ_WRITE_TOKEN) пишет в Vercel Blob и возвращает
 * полный https-URL. Локально (токена нет) пишет в public/uploads и возвращает
 * относительный путь `/uploads/...`. Удаление работает для обоих вариантов.
 */

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Сохраняет файл, возвращает публичный URL (blob https или локальный /uploads/...). */
export async function storeUpload(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  if (useBlob) {
    const { put } = await import("@vercel/blob");
    const { url } = await put(`uploads/${filename}`, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return url;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}

/** Удаляет ранее сохранённый файл по его публичному URL. */
export async function removeUpload(publicUrl: string): Promise<void> {
  if (publicUrl.startsWith("/uploads/")) {
    const name = path.basename(publicUrl);
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
      return;
    }
    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    const abs = path.join(uploadsRoot, name);
    if (!abs.startsWith(uploadsRoot)) {
      return;
    }
    try {
      await unlink(abs);
    } catch {
      /* файл уже отсутствует */
    }
    return;
  }

  if (useBlob && /^https?:\/\//.test(publicUrl)) {
    try {
      const { del } = await import("@vercel/blob");
      await del(publicUrl);
    } catch {
      /* файл уже отсутствует или недоступен */
    }
  }
}
