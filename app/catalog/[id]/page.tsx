import { CatalogItemGallery } from "@/components/catalog-item-gallery";
import { CatalogPageShell } from "@/components/catalog-page-shell";
import { CategorySidebar } from "@/components/category-sidebar";
import { DeliveryCta } from "@/components/delivery-cta";
import { JsonLd } from "@/components/json-ld";
import { Markdown } from "@/components/markdown";
import { ProductContactButton } from "@/components/product-contact-button";
import { prisma } from "@/lib/prisma";
import {
  categoryPath,
  isThinItem,
  metaDescriptionFromMarkdown,
  parseIdSlugSegment,
  productPath,
} from "@/lib/seo";
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  getCategories,
  getSiteName,
} from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

// Дедупликация между generateMetadata и страницей в рамках одного запроса.
const getItem = cache((id: number) =>
  prisma.catalogItem.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  }),
);

/**
 * Возвращает товар для сегмента `12-skamya-sd` и канонизирует URL:
 * мусорные сегменты (`1abc`, `01`) — 404, старый вид `/catalog/12` или
 * устаревший слаг — 308 на канонический.
 */
async function resolveItem(segment: string) {
  const parsed = parseIdSlugSegment(segment);
  if (!parsed) {
    notFound();
  }
  const item = await getItem(parsed.id);
  if (!item) {
    notFound();
  }
  const canonical = productPath(item);
  if (canonical !== `/catalog/${segment}`) {
    permanentRedirect(canonical);
  }
  return item;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: segment } = await params;
  const item = await resolveItem(segment);

  const description =
    metaDescriptionFromMarkdown(item.description) || DEFAULT_DESCRIPTION;
  const imageUrls = (
    item.images.length > 0 ? item.images.map((im) => im.url) : [item.image]
  ).map(absoluteUrl);
  const isThin = isThinItem(item);

  return {
    title: item.name,
    description,
    alternates: { canonical: productPath(item) },
    openGraph: {
      title: item.name,
      description,
      url: productPath(item),
      images: imageUrls,
    },
    ...(isThin ? { robots: { index: false } } : {}),
  };
}

export default async function CatalogItemPage({ params }: PageProps) {
  const { id: segment } = await params;
  const [item, categories, siteName] = await Promise.all([
    resolveItem(segment),
    getCategories(),
    getSiteName(),
  ]);

  const galleryUrls =
    item.images.length > 0 ? item.images.map((im) => im.url) : [item.image];

  const activeCategoryId = item.categoryId ?? null;

  const plainDescription = metaDescriptionFromMarkdown(item.description);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    url: absoluteUrl(productPath(item)),
    image: galleryUrls.map(absoluteUrl),
    ...(plainDescription ? { description: plainDescription } : {}),
    ...(item.category ? { category: item.category.name } : {}),
    brand: { "@type": "Brand", name: siteName },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Каталог", item: absoluteUrl("/") },
      ...(item.category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: item.category.name,
              item: absoluteUrl(categoryPath(item.category)),
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: item.category ? 3 : 2,
        name: item.name,
        item: absoluteUrl(productPath(item)),
      },
    ],
  };

  return (
    <CatalogPageShell
      sidebar={
        <CategorySidebar categories={categories} activeCategoryId={activeCategoryId} />
      }
    >
      <JsonLd data={productJsonLd} />
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
          {item.category ? (
            <>
              <li className="select-none text-muted-foreground" aria-hidden>
                /
              </li>
              <li>
                <Link
                  href={categoryPath(item.category)}
                  className="font-medium text-muted-foreground transition hover:text-foreground hover:underline"
                >
                  {item.category.name}
                </Link>
              </li>
            </>
          ) : null}
          <li className="select-none text-muted-foreground" aria-hidden>
            /
          </li>
          <li className="min-w-0 font-medium text-foreground" aria-current="page">
            <span className="line-clamp-2">{item.name}</span>
          </li>
        </ol>
      </nav>

      <article className="w-full overflow-hidden rounded-2xl border border-border bg-surface dark:shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:gap-8 sm:p-8 md:flex-row md:items-start">
          <div className="min-w-0 w-full flex-1 md:order-1">
            {item.category ? (
              <p className="mb-2">
                <Link
                  href={categoryPath(item.category)}
                  className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground-soft transition hover:bg-muted-strong"
                >
                  {item.category.name}
                </Link>
              </p>
            ) : null}
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {item.name}
            </h1>
            {item.description.trim() ? (
              <div className="mt-4">
                <Markdown>{item.description}</Markdown>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Описание пока не указано.
              </p>
            )}
          </div>

          <div className="mx-auto w-full max-w-[min(100%,360px)] shrink-0 md:order-2 md:mx-0">
            <CatalogItemGallery urls={galleryUrls} alt={item.name} />
            <ProductContactButton product={item.name} />
          </div>
        </div>

        {item.specs.trim() ? (
          <div className="border-t border-border p-6 sm:p-8">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
              Характеристики
            </h2>
            <Markdown>{item.specs}</Markdown>
          </div>
        ) : null}
      </article>

      <div className="mt-6">
        <DeliveryCta
          title="Хотите подробности по доставке?"
          description="Сроки, регионы, способы — на отдельной странице. Вам сюда."
          cta="К условиям доставки →"
        />
      </div>
    </CatalogPageShell>
  );
}
