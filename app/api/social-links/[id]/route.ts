import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { savePublicUpload } from "@/lib/save-public-upload";
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

  const linkId = parseId((await context.params).id);
  if (linkId === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Некорректное тело" }, { status: 400 });
    }

    const label = String(formData.get("label") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    const sortOrderRaw = formData.get("sortOrder");
    const file = formData.get("icon");

    const data: { label?: string; url?: string; sortOrder?: number; icon?: string } = {};
    if (label) data.label = label;
    if (url) data.url = url;
    if (sortOrderRaw !== null && String(sortOrderRaw).trim() !== "") {
      const n = Number.parseInt(String(sortOrderRaw), 10);
      if (Number.isFinite(n)) data.sortOrder = Math.trunc(n);
    }
    if (file instanceof File && file.size > 0) {
      const saved = await savePublicUpload(file);
      if (!saved.ok) {
        return NextResponse.json({ error: saved.error }, { status: 400 });
      }
      data.icon = saved.publicPath;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Нет данных" }, { status: 400 });
    }

    try {
      const link = await prisma.socialLink.update({
        where: { id: linkId },
        data,
      });
      return NextResponse.json(link);
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: "Не удалось обновить" }, { status: 400 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: { label?: string; url?: string; sortOrder?: number } = {};
  if (typeof body === "object" && body !== null) {
    if ("label" in body) {
      const label = String((body as { label: unknown }).label ?? "").trim();
      if (!label) {
        return NextResponse.json({ error: "Пустая подпись" }, { status: 400 });
      }
      data.label = label;
    }
    if ("url" in body) {
      const url = String((body as { url: unknown }).url ?? "").trim();
      if (!url) {
        return NextResponse.json({ error: "Пустая ссылка" }, { status: 400 });
      }
      data.url = url;
    }
    if ("sortOrder" in body) {
      const s = (body as { sortOrder: unknown }).sortOrder;
      if (typeof s === "number" && Number.isFinite(s)) data.sortOrder = Math.trunc(s);
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет полей" }, { status: 400 });
  }

  try {
    const link = await prisma.socialLink.update({
      where: { id: linkId },
      data,
    });
    return NextResponse.json(link);
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

  const linkId = parseId((await context.params).id);
  if (linkId === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await prisma.socialLink.delete({ where: { id: linkId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 400 });
  }
}
