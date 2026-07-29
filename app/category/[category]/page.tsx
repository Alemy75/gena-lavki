import { CatalogGrid } from "@/components/catalog-grid";
import { CatalogPageShell } from "@/components/catalog-page-shell";
import { CategorySidebar } from "@/components/category-sidebar";
import { ContactCta } from "@/components/contact-cta";
import { JsonLd } from "@/components/json-ld";
import { prisma } from "@/lib/prisma";
import { categoryPath, parseIdSlugSegment } from "@/lib/seo";
import { absoluteUrl, getCategories } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ category: string }>;
};

// Дедупликация между generateMetadata и страницей в рамках одного запроса.
const getCategory = cache((id: number) =>
  prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { items: true } } },
  }),
);

/**
 * Возвращает категорию для сегмента `12-skamejki` и канонизирует URL:
 * мусорные сегменты — 404, устаревший/неполный слаг — 308 на канонический.
 */
async function resolveCategory(segment: string) {
  const parsed = parseIdSlugSegment(segment);
  if (!parsed) {
    notFound();
  }
  const category = await getCategory(parsed.id);
  if (!category) {
    notFound();
  }
  const canonical = categoryPath(category);
  if (canonical !== `/category/${segment}`) {
    permanentRedirect(canonical);
  }
  return category;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: segment } = await params;
  const category = await resolveCategory(segment);

  return {
    title: category.name,
    description: `${category.name} ручной работы на заказ: фото, характеристики и подбор размера под ваше место. Доставка по Москве и всей России.`,
    alternates: { canonical: categoryPath(category) },
    // Пустая категория — временное состояние, но отдавать её в индекс
    // одинаковой «пустой» страницей не стоит.
    ...(category._count.items === 0 ? { robots: { index: false } } : {}),
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category: segment } = await params;
  // id известен синхронно — товары и сайдбар не ждут roundtrip категории
  // (resolveCategory валидирует существование и слаг параллельно).
  const parsed = parseIdSlugSegment(segment);
  if (!parsed) {
    notFound();
  }

  const [category, categories, items] = await Promise.all([
    resolveCategory(segment),
    getCategories(),
    prisma.catalogItem.findMany({
      where: { categoryId: parsed.id },
      orderBy: { id: "asc" },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Каталог",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category.name,
        item: absoluteUrl(categoryPath(category)),
      },
    ],
  };

  return (
    <CatalogPageShell
      sidebar={
        <CategorySidebar categories={categories} activeCategoryId={category.id} />
      }
    >
      <JsonLd data={breadcrumbJsonLd} />
      <nav
        className="mb-6 text-sm text-muted-foreground"
        aria-label="Навигация по каталогу"
      >
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <li>
            <Link
              href="/"
              className="font-medium text-muted-foreground transition hover:text-foreground hover:underline"
            >
              Каталог
            </Link>
          </li>
          <li className="select-none text-muted-foreground" aria-hidden>
            /
          </li>
          <li className="font-medium text-foreground" aria-current="page">
            {category.name}
          </li>
        </ol>
      </nav>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">
        {category.name}
      </h1>
      <CatalogGrid items={items} />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          В этой категории пока нет позиций.
        </p>
      ) : null}
      <ContactCta />
    </CatalogPageShell>
  );
}
