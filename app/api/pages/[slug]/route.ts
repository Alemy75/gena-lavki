import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ slug: string }> };

const SLUG_RE = /^[a-z0-9-]+$/;

function badSlug(slug: string): boolean {
  return !slug || slug.length > 100 || !SLUG_RE.test(slug);
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  if (badSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }
  return NextResponse.json(page);
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  if (badSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
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

  const data: { title?: string; content?: string } = {};

  if ("title" in body) {
    const raw = (body as { title: unknown }).title;
    if (typeof raw !== "string" || !raw.trim() || raw.length > 200) {
      return NextResponse.json({ error: "Некорректный заголовок" }, { status: 400 });
    }
    data.title = raw.trim();
  }

  if ("content" in body) {
    const raw = (body as { content: unknown }).content;
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "Некорректный контент" }, { status: 400 });
    }
    if (raw.length > 50_000) {
      return NextResponse.json({ error: "Контент слишком длинный" }, { status: 400 });
    }
    data.content = raw.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  try {
    const page = await prisma.page.update({ where: { slug }, data });
    return NextResponse.json(page);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 400 });
  }
}
