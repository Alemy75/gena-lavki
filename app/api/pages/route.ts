import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/** Список страниц (для админки и общего инфо-меню при необходимости). */
export async function GET() {
  try {
    const pages = await prisma.page.findMany({
      orderBy: { slug: "asc" },
      select: { id: true, slug: true, title: true, updatedAt: true },
    });
    return NextResponse.json(pages);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load pages" }, { status: 500 });
  }
}
