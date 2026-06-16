import { CatalogPageShell } from "@/components/catalog-page-shell";
import { CategorySidebar } from "@/components/category-sidebar";
import { ContactCta } from "@/components/contact-cta";
import { DeliveryBanner } from "@/components/delivery-banner";
import { HeroBanner } from "@/components/hero-banner";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const categoryParam = params.category?.trim() ?? "";
  let activeCategoryId: number | null = null;
  if (categoryParam !== "") {
    const n = Number.parseInt(categoryParam, 10);
    if (Number.isFinite(n) && n > 0) {
      activeCategoryId = n;
    }
  }

  const [categories, items] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
    prisma.catalogItem.findMany({
      where:
        activeCategoryId !== null ? { categoryId: activeCategoryId } : undefined,
      orderBy: { id: "asc" },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  type Item = (typeof items)[number];

  return (
    <CatalogPageShell
      hero={activeCategoryId === null ? <HeroBanner /> : undefined}
      sidebar={
        <CategorySidebar categories={categories} activeCategoryId={activeCategoryId} />
      }
      bottom={activeCategoryId === null ? <DeliveryBanner /> : undefined}
    >
      <h2 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">
        Позиции каталога
      </h2>
      <ul className="grid w-full list-none gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item: Item) => (
          <li key={item.id}>
            <Link
              href={`/catalog/${item.id}`}
              className="block h-full rounded-2xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface dark:shadow-sm ring-border transition hover:border-input-border dark:hover:shadow-md">
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */}
                  <img
                    src={
                      item.images.length > 0 ? item.images[0]!.url : item.image
                    }
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex-1 p-4">
                  {item.category ? (
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {item.category.name}
                    </p>
                  ) : null}
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                    {item.name}
                  </p>
                </div>
              </article>
            </Link>
          </li>
        ))}
      </ul>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          В этой категории пока нет позиций.
        </p>
      ) : null}
      <ContactCta />
    </CatalogPageShell>
  );
}
