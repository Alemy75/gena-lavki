import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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
      include: { category: true },
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
  const file = formData.get("image");

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

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Выберите файл изображения" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Файл больше 5 МБ" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Допустимы только JPEG, PNG, WebP, GIF" },
      { status: 400 },
    );
  }

  const ext =
    {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    }[file.type] ?? ".jpg";

  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const publicPath = `/uploads/${filename}`;

  try {
    const item = await prisma.catalogItem.create({
      data: { name, description, image: publicPath, categoryId },
      include: { category: true },
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
