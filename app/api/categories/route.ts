import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to read categories" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name =
    typeof body === "object" && body !== null && "name" in body
      ? String((body as { name: unknown }).name ?? "").trim()
      : "";
  const sortOrderRaw =
    typeof body === "object" && body !== null && "sortOrder" in body
      ? (body as { sortOrder: unknown }).sortOrder
      : undefined;

  if (!name) {
    return NextResponse.json({ error: "Укажите название" }, { status: 400 });
  }

  let sortOrder = 0;
  if (typeof sortOrderRaw === "number" && Number.isFinite(sortOrderRaw)) {
    sortOrder = Math.trunc(sortOrderRaw);
  }

  try {
    const category = await prisma.category.create({
      data: { name, sortOrder },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Не удалось создать категорию (возможно, имя занято)" },
      { status: 400 },
    );
  }
}
