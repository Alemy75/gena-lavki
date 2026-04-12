import { ContactCta } from "@/components/contact-cta";
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
      include: { category: true },
    }),
  ]);

  type Item = (typeof items)[number];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start md:gap-8 sm:px-6 lg:px-8">
      <aside className="shrink-0 md:w-52">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Категории
        </h2>
        <nav className="flex flex-row flex-wrap gap-2 md:flex-col md:flex-nowrap md:gap-0 md:border-l md:border-zinc-200 md:dark:border-zinc-700">
          <Link
            href="/"
            className={`rounded-lg px-3 py-2 text-sm md:-ml-px md:rounded-l-none md:border-l-2 md:py-1.5 ${
              activeCategoryId === null
                ? "border-zinc-900 bg-zinc-100 font-medium text-zinc-900 md:border-l-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-50"
                : "border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100"
            }`}
          >
            Все
          </Link>
          {categories.map((cat) => {
            const active = activeCategoryId === cat.id;
            return (
              <Link
                key={cat.id}
                href={`/?category=${cat.id}`}
                className={`rounded-lg px-3 py-2 text-sm md:-ml-px md:rounded-l-none md:border-l-2 md:py-1.5 ${
                  active
                    ? "border-zinc-900 bg-zinc-100 font-medium text-zinc-900 md:border-l-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-50"
                    : "border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Позиции каталога
        </h1>
        <ul className="grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {items.map((item: Item) => (
            <li key={item.id}>
              <Link
                href={`/catalog/${item.id}`}
                className="block h-full rounded-2xl outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400"
              >
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm ring-zinc-900/5 transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5 dark:hover:border-zinc-700">
                  <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */}
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex-1 p-4">
                    {item.category ? (
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {item.category.name}
                      </p>
                    ) : null}
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </p>
                  </div>
                </article>
              </Link>
            </li>
          ))}
        </ul>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            В этой категории пока нет позиций.
          </p>
        ) : null}
        <ContactCta />
      </div>
    </div>
  );
}
