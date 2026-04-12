import { unlink } from "fs/promises";
import path from "path";

/** Удаляет файл из public/uploads, если URL локальный `/uploads/...` */
export async function deleteUploadedImageIfLocal(publicUrl: string): Promise<void> {
  if (!publicUrl.startsWith("/uploads/")) {
    return;
  }
  const name = path.basename(publicUrl);
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    return;
  }
  const abs = path.join(process.cwd(), "public", "uploads", name);
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  if (!abs.startsWith(uploadsRoot)) {
    return;
  }
  try {
    await unlink(abs);
  } catch {
    /* файл уже отсутствует */
  }
}
