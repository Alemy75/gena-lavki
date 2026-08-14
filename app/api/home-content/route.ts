import { auth } from "@/auth";
import { HOME_DEFAULTS } from "@/lib/home-content";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const FIELDS = [
  "heroTitle",
  "heroText",
  "deliveryTitle",
  "deliveryText",
  "deliveryFeatures",
] as const;

async function ensureHomeContent() {
  return prisma.homeContent.upsert({
    where: { id: 1 },
    // Создаём сразу с дефолтами: пустая строка означала бы «пунктов доставки нет»
    // (см. правило в lib/home-content.ts) — открытие админки молча вычистило бы
    // список с главной, и вернуть его из формы было бы нечем.
    create: { id: 1, ...HOME_DEFAULTS },
    update: {},
  });
}

export async function GET() {
  try {
    const row = await ensureHomeContent();
    return NextResponse.json(row);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load home content" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  for (const field of FIELDS) {
    if (field in body) {
      data[field] = String((body as Record<string, unknown>)[field] ?? "");
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  try {
    await ensureHomeContent();
    const row = await prisma.homeContent.update({ where: { id: 1 }, data });
    return NextResponse.json(row);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
