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

  const item = await prisma.catalogItem.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!item) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="mb-6">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← К списку
        </Link>
      </p>
      <article className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="p-6 sm:p-8">
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
      </article>
    </div>
  );
}
