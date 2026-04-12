import { auth } from "@/auth";
import { deleteUploadedImageIfLocal } from "@/lib/delete-uploaded-image";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string; imageId: string }> };

const imagesInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  category: true,
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawItemId, imageId: rawImageId } = await context.params;
  const itemId = Number.parseInt(rawItemId, 10);
  const imageId = Number.parseInt(rawImageId, 10);
  if (!Number.isFinite(itemId) || itemId < 1 || !Number.isFinite(imageId) || imageId < 1) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const row = await prisma.catalogItemImage.findFirst({
    where: { id: imageId, catalogItemId: itemId },
  });
  if (!row) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const count = await prisma.catalogItemImage.count({ where: { catalogItemId: itemId } });
  if (count <= 1) {
    return NextResponse.json(
      { error: "Нельзя удалить последнее изображение" },
      { status: 400 },
    );
  }

  await deleteUploadedImageIfLocal(row.url);
  await prisma.catalogItemImage.delete({ where: { id: imageId } });

  const remaining = await prisma.catalogItemImage.findMany({
    where: { catalogItemId: itemId },
    orderBy: { sortOrder: "asc" },
  });
  const cover = remaining[0];
  if (!cover) {
    return NextResponse.json({ error: "Некорректное состояние" }, { status: 500 });
  }

  await prisma.catalogItem.update({
    where: { id: itemId },
    data: { image: cover.url },
  });

  const item = await prisma.catalogItem.findUnique({
    where: { id: itemId },
    include: imagesInclude,
  });

  return NextResponse.json(item);
}
