import { randomBytes } from "crypto";

import { storeUpload } from "@/lib/upload-storage";

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function validateImageFile(file: File): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return "Пустой файл";
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return "Файл больше 5 МБ";
  }
  if (!IMAGE_ALLOWED_TYPES.has(file.type)) {
    return "Допустимы только JPEG, PNG, WebP, GIF";
  }
  return null;
}

/** Сохраняет файл и возвращает публичный URL (Vercel Blob или локальный `/uploads/...`). */
export async function saveUploadedImageFile(file: File): Promise<string> {
  const err = validateImageFile(file);
  if (err) {
    throw new Error(err);
  }
  const ext = EXT_BY_TYPE[file.type] ?? ".jpg";
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  return storeUpload(filename, buffer, file.type);
}
