import { CatalogItemGallery } from "@/components/catalog-item-gallery";
import { CatalogPageShell } from "@/components/catalog-page-shell";
import { CategorySidebar } from "@/components/category-sidebar";
import { Markdown } from "@/components/markdown";
import { ProductContactButton } from "@/components/product-contact-button";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CatalogItemPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id < 1) {
    notFound();
  }

  const [item, categories] = await Promise.all([
    prisma.catalogItem.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
  ]);

  if (!item) {
    notFound();
  }

  const galleryUrls =
    item.images.length > 0 ? item.images.map((im) => im.url) : [item.image];

  const activeCategoryId = item.categoryId ?? null;

  return (
    <CatalogPageShell
      sidebar={
        <CategorySidebar categories={categories} activeCategoryId={activeCategoryId} />
      }
    >
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
          <li className="min-w-0 font-medium text-foreground" aria-current="page">
            <span className="line-clamp-2">{item.name}</span>
          </li>
        </ol>
      </nav>

      <article className="w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:gap-8 sm:p-8 md:flex-row md:items-start">
          <div className="min-w-0 w-full flex-1 md:order-1">
            {item.category ? (
              <p className="mb-2">
                <Link
                  href={`/?category=${item.category.id}`}
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
      </article>
    </CatalogPageShell>
  );
}
