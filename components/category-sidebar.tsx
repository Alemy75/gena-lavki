import Link from "next/link";

type Category = { id: number; name: string };

export function CategorySidebar({
  categories,
  activeCategoryId,
}: {
  categories: Category[];
  activeCategoryId: number | null;
}) {
  const activeClass =
    "border-primary bg-muted font-medium text-foreground md:border-l-primary";
  const inactiveClass =
    "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <aside className="w-full shrink-0 md:w-52">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Категории
      </h2>
      <nav className="flex flex-row flex-wrap gap-2 md:flex-col md:flex-nowrap md:gap-0 md:border-l md:border-border">
        <Link
          href="/"
          className={`rounded-lg px-3 py-2 text-sm md:-ml-px md:rounded-l-none md:border-l-2 md:py-1.5 ${
            activeCategoryId === null ? activeClass : inactiveClass
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
                active ? activeClass : inactiveClass
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
