import { Markdown } from "@/components/markdown";
import { prisma } from "@/lib/prisma";
import { metaDescriptionFromMarkdown } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

// Дедупликация между generateMetadata и страницей в рамках одного запроса.
const getPage = cache(async (slug: string) => {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return null;
  }
  return prisma.page.findUnique({ where: { slug } });
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) {
    notFound();
  }

  return {
    title: page.title,
    description: metaDescriptionFromMarkdown(page.content) || undefined,
    alternates: { canonical: `/info/${slug}` },
    // Незаполненная страница — thin content, в индекс не отдаём.
    ...(page.content.trim() ? {} : { robots: { index: false } }),
  };
}

export default async function InfoPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPage(slug);
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
