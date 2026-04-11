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
  const address = settings?.address?.trim() ?? "";
  const telHref = phone ? phone.replace(/[^\d+]/g, "") : "";

  return (
    <footer className="border-t border-zinc-200 bg-white py-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2 text-center sm:text-left">
            {phone ? (
              <p>
                <span className="text-zinc-500 dark:text-zinc-500">Телефон: </span>
                <a
                  href={telHref ? `tel:${telHref}` : undefined}
                  className="font-medium text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
                >
                  {phone}
                </a>
              </p>
            ) : null}
            {address ? (
              <p className="whitespace-pre-line text-zinc-700 dark:text-zinc-300">{address}</p>
            ) : null}
            {!phone && !address && socialLinks.length === 0 ? (
              <p className="text-zinc-400 dark:text-zinc-500">
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
                  className="flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-800"
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

        <p className="mt-6 border-t border-zinc-200 pt-4 text-center text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          © {new Date().getFullYear()} Каталог
        </p>
      </div>
    </footer>
  );
}
