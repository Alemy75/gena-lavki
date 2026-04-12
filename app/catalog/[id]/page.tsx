import { CategorySidebar } from "@/components/category-sidebar";
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
      include: { category: true },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
  ]);

  if (!item) {
    notFound();
  }

  const activeCategoryId = item.categoryId ?? null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start md:gap-8 sm:px-6 lg:px-8">
      <CategorySidebar categories={categories} activeCategoryId={activeCategoryId} />

      <div className="min-w-0 flex-1">
        <nav
          className="mb-6 text-sm text-zinc-600 dark:text-zinc-400"
          aria-label="Навигация по каталогу"
        >
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link
                href="/"
                className="font-medium text-zinc-600 transition hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Каталог
              </Link>
            </li>
            <li className="select-none text-zinc-400 dark:text-zinc-500" aria-hidden>
              /
            </li>
            <li className="min-w-0 font-medium text-zinc-900 dark:text-zinc-100" aria-current="page">
              <span className="line-clamp-2">{item.name}</span>
            </li>
          </ol>
        </nav>

        <article className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex flex-col gap-6 p-6 sm:gap-8 sm:p-8 md:flex-row md:items-start">
            <div className="min-w-0 flex-1 md:order-1">
              {item.category ? (
                <p className="mb-2">
                  <Link
                    href={`/?category=${item.category.id}`}
                    className="inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    {item.category.name}
                  </Link>
                </p>
              ) : null}
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {item.name}
              </h1>
              {item.description.trim() ? (
                <div className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {item.description}
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Описание пока не указано.
                </p>
              )}
            </div>

            <div className="mx-auto w-full max-w-[220px] shrink-0 sm:max-w-[260px] md:order-2 md:mx-0 md:max-w-[min(100%,280px)]">
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:ring-zinc-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
