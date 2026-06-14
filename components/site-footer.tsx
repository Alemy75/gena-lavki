import { ThemeToggle } from "@/components/theme-toggle";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export async function SiteFooter() {
  const [settings, socialLinks] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: 1 } }),
    prisma.socialLink.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
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

        <div className="mt-6 flex flex-col items-center gap-4 border-t border-border pt-4 sm:flex-row sm:justify-between">
          <p className="text-muted-foreground">© {new Date().getFullYear()} Каталог</p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
