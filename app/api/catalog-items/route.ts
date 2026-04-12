import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedImageFile, validateImageFile } from "@/lib/save-uploaded-image";
import { NextResponse } from "next/server";

const imagesInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  category: true,
};

function collectImageFiles(formData: FormData): File[] {
  const fromImages = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (fromImages.length > 0) {
    return fromImages;
  }
  const single = formData.get("image");
  if (single instanceof File && single.size > 0) {
    return [single];
  }
  return [];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const categoryParam = url.searchParams.get("categoryId");
    let categoryIdFilter: number | undefined;
    if (categoryParam !== null && categoryParam !== "") {
      const n = Number.parseInt(categoryParam, 10);
      if (!Number.isFinite(n) || n < 1) {
        return NextResponse.json({ error: "Некорректный categoryId" }, { status: 400 });
      }
      categoryIdFilter = n;
    }

    const items = await prisma.catalogItem.findMany({
      where:
        categoryIdFilter !== undefined ? { categoryId: categoryIdFilter } : undefined,
      orderBy: { id: "asc" },
      include: imagesInclude,
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to read from database" },
      { status: 500 },
    );
  }
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

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryIdRaw = formData.get("categoryId");
  const files = collectImageFiles(formData);

  let categoryId: number | null = null;
  if (categoryIdRaw !== null && String(categoryIdRaw).trim() !== "") {
    const n = Number.parseInt(String(categoryIdRaw), 10);
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ error: "Некорректная категория" }, { status: 400 });
    }
    const exists = await prisma.category.findUnique({ where: { id: n } });
    if (!exists) {
      return NextResponse.json({ error: "Категория не найдена" }, { status: 400 });
    }
    categoryId = n;
  }

  if (!name) {
    return NextResponse.json({ error: "Укажите название" }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json(
      { error: "Выберите хотя бы одно изображение" },
      { status: 400 },
    );
  }

  for (const file of files) {
    const err = validateImageFile(file);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
  }

  let publicPaths: string[];
  try {
    publicPaths = await Promise.all(files.map((f) => saveUploadedImageFile(f)));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка загрузки файла";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const coverUrl = publicPaths[0]!;

  try {
    const item = await prisma.catalogItem.create({
      data: {
        name,
        description,
        image: coverUrl,
        categoryId,
        images: {
          create: publicPaths.map((url, sortOrder) => ({ url, sortOrder })),
        },
      },
      include: imagesInclude,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Не удалось сохранить" },
      { status: 500 },
    );
  }
}
