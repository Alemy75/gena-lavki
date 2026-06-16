import { Markdown } from "@/components/markdown";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function InfoPage({ params }: PageProps) {
  const { slug } = await params;
  if (!/^[a-z0-9-]+$/.test(slug)) {
    notFound();
  }

  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Навигация">
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
          <li className="font-medium text-foreground" aria-current="page">
            {page.title}
          </li>
        </ol>
      </nav>

      <article className="rounded-2xl border border-border bg-surface p-6 sm:p-8 dark:shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {page.title}
        </h1>
        {page.content.trim() ? (
          <Markdown>{page.content}</Markdown>
        ) : (
          <p className="text-sm text-muted-foreground">
            Содержимое страницы пока не заполнено.
          </p>
        )}
      </article>
    </div>
  );
}
