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
