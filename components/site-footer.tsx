import { ThemeToggle } from "@/components/theme-toggle";
import {
  getInfoPages,
  getSiteName,
  getSiteSettings,
  getSocialLinks,
} from "@/lib/site";
import Link from "next/link";

export async function SiteFooter() {
  const [settings, socialLinks, linkedPages, siteName] = await Promise.all([
    getSiteSettings(),
    getSocialLinks(),
    getInfoPages(),
    getSiteName(),
  ]);

  const phone = settings?.phone?.trim() ?? "";
  const email = settings?.email?.trim() ?? "";
  const address = settings?.address?.trim() ?? "";
  const telHref = phone ? phone.replace(/[^\d+]/g, "") : "";

  return (
    <footer className="border-t border-border bg-surface py-6 text-sm text-muted-foreground">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2 text-center sm:text-left">
            {phone ? (
              <p>
                <span className="text-muted-foreground">Телефон: </span>
                <a
                  href={telHref ? `tel:${telHref}` : undefined}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {phone}
                </a>
              </p>
            ) : null}
            {email ? (
              <p>
                <span className="text-muted-foreground">Почта: </span>
                <a
                  href={`mailto:${email}`}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {email}
                </a>
              </p>
            ) : null}
            {address ? (
              <p className="whitespace-pre-line text-foreground-soft">{address}</p>
            ) : null}
            {!phone && !email && !address && socialLinks.length === 0 ? (
              <p className="text-muted-foreground">
                Контакты и соцсети можно добавить в админке.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-4 sm:items-end">
            {linkedPages.length > 0 ? (
              <nav aria-label="Информация">
                <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-end">
                  {linkedPages.map((page) => (
                    <li key={page.slug}>
                      <Link
                        href={`/info/${page.slug}`}
                        className="text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}

            {socialLinks.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
                {socialLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    title={link.label}
                    className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-foreground transition hover:bg-muted-strong"
                  >
                    {link.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={link.icon}
                        alt=""
                        className="size-7 object-contain"
                      />
                    ) : (
                      <span className="px-1 text-center text-[10px] font-semibold leading-tight">
                        {link.label.slice(0, 2)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4 border-t border-border pt-4 sm:flex-row sm:justify-between">
          <p className="text-muted-foreground">© {new Date().getFullYear()} {siteName}</p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
