import Link from "next/link";

type Category = { id: number; name: string };

export function CategorySidebar({
  categories,
  activeCategoryId,
}: {
  categories: Category[];
  activeCategoryId: number | null;
}) {
  return (
    <aside className="w-full shrink-0 md:w-52">
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
  );
}
