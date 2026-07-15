import { prisma } from "@/lib/prisma";
import { cache } from "react";

/**
 * Абсолютный адрес сайта для canonical, OG, sitemap и robots.
 * В проде задаётся через SITE_URL (или уже существующий AUTH_URL) в /opt/gena-lavki/.env.
 * Читается только в рантайме (все страницы force-dynamic), поэтому
 * в Docker-сборку значение не запекается.
 */
export function siteUrl(): string {
  const raw =
    process.env.SITE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** Абсолютный URL из пути вида `/catalog/1-skamya` или `/uploads/x.jpg`. */
export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Имя сайта, пока админ не задал своё в «Компании». */
export const DEFAULT_SITE_NAME = "Каталог";

/** Дефолтное описание для главной и как фолбэк для страниц без текста. */
export const DEFAULT_DESCRIPTION =
  "Лавки, скамейки и садовая мебель ручной работы на заказ: подберём размер, цвет и форму под ваше место. Доставка по Москве и всей России.";

/**
 * Настройки сайта, дедуплицированные в рамках одного запроса:
 * их читают root layout (шапка), generateMetadata и футер.
 */
export const getSiteSettings = cache(() =>
  prisma.siteSettings.findUnique({ where: { id: 1 } }),
);

export const getSocialLinks = cache(() =>
  prisma.socialLink.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
);

/**
 * Инфо-страницы для футера и sitemap. Пустые не возвращаем вовсе:
 * они noindex, их нельзя ни линковать, ни отдавать в sitemap —
 * фильтр живёт здесь, чтобы потребители не разъезжались.
 */
export const getInfoPages = cache(async () => {
  const pages = await prisma.page.findMany({
    select: { slug: true, title: true, content: true, updatedAt: true },
    orderBy: { id: "asc" },
  });
  return pages
    .filter((page) => page.content.trim() !== "")
    .map(({ slug, title, updatedAt }) => ({ slug, title, updatedAt }));
});

/** Категории для сайдбара — один порядок сортировки на всех страницах. */
export const getCategories = cache(() =>
  prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
);

export async function getSiteName(): Promise<string> {
  const settings = await getSiteSettings();
  return settings?.siteName?.trim() || DEFAULT_SITE_NAME;
}
