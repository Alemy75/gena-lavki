import { auth } from "@/auth";
import { deleteUploadedImageIfLocal } from "@/lib/delete-uploaded-image";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const itemId = parseId((await context.params).id);
  if (itemId === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Ожидается объект" }, { status: 400 });
  }

  const data: { categoryId?: number | null; description?: string; specs?: string } = {};

  if ("categoryId" in body) {
    const raw = (body as { categoryId: unknown }).categoryId;
    if (raw === null) {
      data.categoryId = null;
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      const n = Math.trunc(raw);
      if (n < 1) {
        return NextResponse.json({ error: "Некорректная категория" }, { status: 400 });
      }
      const exists = await prisma.category.findUnique({ where: { id: n } });
      if (!exists) {
        return NextResponse.json({ error: "Категория не найдена" }, { status: 400 });
      }
      data.categoryId = n;
    } else {
      return NextResponse.json({ error: "Некорректный categoryId" }, { status: 400 });
    }
  }

  if ("description" in body) {
    const raw = (body as { description: unknown }).description;
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "Некорректное описание" }, { status: 400 });
    }
    if (raw.length > 20_000) {
      return NextResponse.json({ error: "Описание слишком длинное" }, { status: 400 });
    }
    data.description = raw.trim();
  }

  if ("specs" in body) {
    const raw = (body as { specs: unknown }).specs;
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "Некорректные характеристики" }, { status: 400 });
    }
    if (raw.length > 20_000) {
      return NextResponse.json({ error: "Характеристики слишком длинные" }, { status: 400 });
    }
    data.specs = raw.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  try {
    const item = await prisma.catalogItem.update({
      where: { id: itemId },
      data,
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const itemId = parseId((await context.params).id);
  if (itemId === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const item = await prisma.catalogItem.findUnique({
    where: { id: itemId },
    include: { images: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  // Сначала чистим локальные файлы картинок (Unsplash/внешние URL безопасно игнорируются)
  for (const img of item.images) {
    await deleteUploadedImageIfLocal(img.url);
  }
  await deleteUploadedImageIfLocal(item.image);

  // Строки catalog_item_image удалятся каскадом (onDelete: Cascade)
  await prisma.catalogItem.delete({ where: { id: itemId } });

  return NextResponse.json({ ok: true });
}
