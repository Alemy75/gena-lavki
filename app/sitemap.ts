import { prisma } from "@/lib/prisma";
import { categoryPath, isThinItem, productPath } from "@/lib/seo";
import { getInfoPages, siteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

// Sitemap читает БД, которой нет при `next build` (все страницы force-dynamic
// по той же причине) — генерируем строго на запрос.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const [items, categories, pages] = await Promise.all([
    prisma.catalogItem.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        specs: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.category.findMany({
      select: {
        id: true,
        name: true,
        updatedAt: true,
        _count: { select: { items: true } },
      },
      orderBy: { id: "asc" },
    }),
    getInfoPages(),
  ]);

  // В sitemap — только индексируемые URL. Товары-пустышки и пустые категории
  // получают noindex в generateMetadata и сюда не попадают; пустые
  // инфо-страницы отсекает сам getInfoPages.
  const indexableItems = items.filter((item) => !isThinItem(item));
  const indexableCategories = categories.filter((cat) => cat._count.items > 0);

  const newestItem = items.reduce<Date | undefined>(
    (latest, item) =>
      !latest || item.updatedAt > latest ? item.updatedAt : latest,
    undefined,
  );

  return [
    {
      url: `${base}/`,
      lastModified: newestItem,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...indexableCategories.map((cat) => ({
      url: `${base}${categoryPath(cat)}`,
      lastModified: cat.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...indexableItems.map((item) => ({
      url: `${base}${productPath(item)}`,
      lastModified: item.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...pages.map((page) => ({
      url: `${base}/info/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
