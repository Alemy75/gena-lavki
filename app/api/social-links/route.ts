import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { savePublicUpload } from "@/lib/save-public-upload";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const links = await prisma.socialLink.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    return NextResponse.json(links);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
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

  const label = String(formData.get("label") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const sortOrderRaw = formData.get("sortOrder");
  const file = formData.get("icon");

  if (!label) {
    return NextResponse.json({ error: "Укажите название" }, { status: 400 });
  }
  if (!url) {
    return NextResponse.json({ error: "Укажите ссылку" }, { status: 400 });
  }

  let sortOrder = 0;
  if (sortOrderRaw !== null && String(sortOrderRaw).trim() !== "") {
    const n = Number.parseInt(String(sortOrderRaw), 10);
    if (Number.isFinite(n)) sortOrder = Math.trunc(n);
  }

  let icon = "";
  if (file instanceof File && file.size > 0) {
    const saved = await savePublicUpload(file);
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }
    icon = saved.publicPath;
  }

  try {
    const link = await prisma.socialLink.create({
      data: { label, url, icon, sortOrder },
    });
    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
