import { removeUpload } from "@/lib/upload-storage";

/** Удаляет ранее загруженный файл (локальный `/uploads/...` или Vercel Blob). */
export async function deleteUploadedImageIfLocal(publicUrl: string): Promise<void> {
  await removeUpload(publicUrl);
}
