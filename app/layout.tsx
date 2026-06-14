import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HeaderContactButton } from "@/components/header-contact-button";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Каталог",
  description: "Каталог товаров",
};

// Все страницы читают БД (настройки сайта, соцссылки в футере) — рендерим
// только на запрос, без пререндера при `next build` (при сборке БД нет).
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const phone = settings?.phone?.trim() ?? "";
  const email = settings?.email?.trim() ?? "";
  const telHref = phone ? phone.replace(/[^\d+]/g, "") : "";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}
    >
      <body
        className={`${geistSans.className} flex min-h-dvh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100`}
      >
        <Providers>
        <header className="shrink-0 border-b border-zinc-200 bg-white py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Каталог
            </Link>
            <div className="flex items-center gap-4 text-sm sm:gap-6">
              <div className="hidden flex-col items-end leading-tight sm:flex">
                {phone ? (
                  <a
                    href={telHref ? `tel:${telHref}` : undefined}
                    className="font-medium text-zinc-800 hover:underline dark:text-zinc-100"
                  >
                    {phone}
                  </a>
                ) : null}
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="text-zinc-500 hover:underline dark:text-zinc-400"
                  >
                    {email}
                  </a>
                ) : null}
              </div>
              <HeaderContactButton />
            </div>
          </div>
        </header>
        <main className="flex min-h-[100dvh] w-full min-w-0 flex-1 flex-col">{children}</main>
        <div className="shrink-0">
          <SiteFooter />
        </div>
        </Providers>
      </body>
    </html>
  );
}
