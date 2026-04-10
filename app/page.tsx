import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const items = await prisma.catalogItem.findMany({
    orderBy: { id: "asc" },
  });
  type Item = (typeof items)[number];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Позиции каталога
      </h1>
      <ul className="grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item: Item) => (
          <li key={item.id}>
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
              <p className="line-clamp-2 flex-1 p-4 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                {item.name}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
