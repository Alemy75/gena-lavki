import { JsonLd } from "@/components/json-ld";
import { HeaderContactButton } from "@/components/header-contact-button";
import { SiteFooter } from "@/components/site-footer";
import { YandexMetrika } from "@/components/yandex-metrika";
import {
  DEFAULT_DESCRIPTION,
  getSiteName,
  getSiteSettings,
  getSocialLinks,
  siteUrl,
} from "@/lib/site";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  // Сайт кириллический: без сабсета cyrillic весь текст рендерился бы
  // системным фолбэком, а Geist грузился бы впустую.
  subsets: ["latin", "cyrillic"],
});

// Все страницы читают БД (настройки сайта, соцссылки в футере) — рендерим
// только на запрос, без пререндера при `next build` (при сборке БД нет).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName();
  const title = `${siteName} — лавки и садовая мебель ручной работы`;

  // getSiteSettings() закэширован через cache() из react — RootLayout читает
  // те же настройки, повторного запроса к БД не будет.
  const settings = await getSiteSettings();
  // Файл app/favicon.ico перенесён в public/favicon-default.ico: файловая
  // конвенция Next сама добавляет <link rel="icon">, и вместе с тегом из
  // metadata.icons в <head> оказались бы два конкурирующих тега.
  const favicon = settings?.favicon?.trim() || "/favicon-default.ico";

  const verification: NonNullable<Metadata["verification"]> = {};
  if (process.env.YANDEX_VERIFICATION) {
    verification.yandex = process.env.YANDEX_VERIFICATION;
  }
  if (process.env.GOOGLE_SITE_VERIFICATION) {
    verification.google = process.env.GOOGLE_SITE_VERIFICATION;
  }

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: title,
      template: `%s — ${siteName}`,
    },
    icons: { icon: favicon },
    description: DEFAULT_DESCRIPTION,
    openGraph: {
      siteName,
      locale: "ru_RU",
      type: "website",
      images: ["/hero-bench.webp"],
    },
    twitter: {
      card: "summary_large_image",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification,
  };
}

export const viewport: Viewport = {
  // Цвета фона из globals.css (:root и .dark)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, socialLinks, siteName] = await Promise.all([
    getSiteSettings(),
    getSocialLinks(),
    getSiteName(),
  ]);
  const phone = settings?.phone?.trim() ?? "";
  const email = settings?.email?.trim() ?? "";
  const address = settings?.address?.trim() ?? "";
  const logo = settings?.logo?.trim() ?? "";
  const telHref = phone ? phone.replace(/[^\d+]/g, "") : "";

  const organizationJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: `${siteUrl()}/`,
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    ...(address ? { address } : {}),
    ...(socialLinks.length > 0
      ? { sameAs: socialLinks.map((link) => link.url) }
      : {}),
  };

  return (
    <html
      lang="ru"
      className={`${geistSans.variable} min-h-dvh antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* До отрисовки выставляем класс темы из localStorage или темы ОС — без мигания. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.className} flex min-h-dvh flex-col bg-background text-foreground`}
      >
        <JsonLd data={organizationJsonLd} />
        <YandexMetrika />
        <Providers>
        <header className="shrink-0 border-b border-border bg-surface py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight"
            >
              {logo ? (
                /* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */
                <img
                  src={logo}
                  alt=""
                  aria-hidden="true"
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded object-cover"
                />
              ) : null}
              {siteName}
            </Link>
            <div className="flex items-center gap-4 text-sm sm:gap-6">
              <div className="hidden flex-col items-end leading-tight sm:flex">
                {phone ? (
                  <a
                    href={telHref ? `tel:${telHref}` : undefined}
                    className="font-medium text-foreground hover:underline"
                  >
                    {phone}
                  </a>
                ) : null}
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="text-muted-foreground hover:underline"
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
