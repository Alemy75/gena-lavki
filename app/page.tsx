import { CatalogGrid } from "@/components/catalog-grid";
import { CatalogPageShell } from "@/components/catalog-page-shell";
import { CategorySidebar } from "@/components/category-sidebar";
import { ContactCta } from "@/components/contact-cta";
import { DeliveryBanner } from "@/components/delivery-banner";
import { HeroBanner } from "@/components/hero-banner";
import { JsonLd } from "@/components/json-ld";
import { getHomeContent } from "@/lib/home-content";
import { prisma } from "@/lib/prisma";
import { categoryPath, productPath } from "@/lib/seo";
import { absoluteUrl, getCategories } from "@/lib/site";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const categoryParam = params.category?.trim() ?? "";

  // Прежние фильтры /?category=N переехали на канонические лендинги
  // /category/N-slug; любые невалидные значения параметра — на главную,
  // чтобы не плодить индексируемые дубли под разными URL.
  if (categoryParam !== "") {
    if (/^[1-9]\d*$/.test(categoryParam)) {
      const category = await prisma.category.findUnique({
        where: { id: Number.parseInt(categoryParam, 10) },
      });
      if (category) {
        permanentRedirect(categoryPath(category));
      }
    }
    permanentRedirect("/");
  }

  const [categories, items] = await Promise.all([
    getCategories(),
    prisma.catalogItem.findMany({
      orderBy: { id: "asc" },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);
  const home = await getHomeContent();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(productPath(item)),
    })),
  };

  return (
    <CatalogPageShell
      hero={<HeroBanner title={home.heroTitle} text={home.heroText} />}
      sidebar={<CategorySidebar categories={categories} activeCategoryId={null} />}
      bottom={
        <DeliveryBanner
          title={home.deliveryTitle}
          text={home.deliveryText}
          features={home.deliveryFeatures}
        />
      }
    >
      <JsonLd data={itemListJsonLd} />
      <h2 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">
        Позиции каталога
      </h2>
      <CatalogGrid items={items} />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          В каталоге пока нет позиций.
        </p>
      ) : null}
      <ContactCta />
    </CatalogPageShell>
  );
}
