import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedImageFile, validateImageFile } from "@/lib/save-uploaded-image";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

const imagesInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  category: true,
};

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const itemId = parseId((await context.params).id);
  if (itemId === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const item = await prisma.catalogItem.findUnique({ where: { id: itemId } });
  if (!item) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  let files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    const single = formData.get("image");
    if (single instanceof File && single.size > 0) {
      files = [single];
    }
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "Выберите хотя бы одно изображение" }, { status: 400 });
  }

  for (const file of files) {
    const err = validateImageFile(file);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
  }

  let urls: string[];
  try {
    urls = await Promise.all(files.map((f) => saveUploadedImageFile(f)));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка загрузки файла";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const agg = await prisma.catalogItemImage.aggregate({
    where: { catalogItemId: itemId },
    _max: { sortOrder: true },
  });
  const sortBase = (agg._max.sortOrder ?? -1) + 1;

  try {
    await prisma.$transaction(
      urls.map((url, i) =>
        prisma.catalogItemImage.create({
          data: {
            catalogItemId: itemId,
            url,
            sortOrder: sortBase + i,
          },
        }),
      ),
    );

    const updated = await prisma.catalogItem.findUnique({
      where: { id: itemId },
      include: imagesInclude,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
