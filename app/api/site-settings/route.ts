import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function ensureSettings() {
  let row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!row) {
    row = await prisma.siteSettings.create({
      data: { id: 1, phone: "", address: "" },
    });
  }
  return row;
}

export async function GET() {
  try {
    const settings = await ensureSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
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

  const phone =
    typeof body === "object" && body !== null && "phone" in body
      ? String((body as { phone: unknown }).phone ?? "")
      : undefined;
  const address =
    typeof body === "object" && body !== null && "address" in body
      ? String((body as { address: unknown }).address ?? "")
      : undefined;

  if (phone === undefined && address === undefined) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  try {
    await ensureSettings();
    const settings = await prisma.siteSettings.update({
      where: { id: 1 },
      data: {
        ...(phone !== undefined ? { phone } : {}),
        ...(address !== undefined ? { address } : {}),
      },
    });
    return NextResponse.json(settings);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
