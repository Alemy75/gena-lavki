"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin/categories", label: "Категории" },
  { href: "/admin/items", label: "Позиции" },
  { href: "/admin/company", label: "Данные компании" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (status === "unauthenticated" || !session) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Админка каталога
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.user?.email}
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg border border-input-border px-3 py-1.5 text-sm"
        >
          Выйти
        </button>
      </div>

      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
        <aside className="shrink-0 md:w-52">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Разделы
          </h2>
          <nav className="flex flex-row flex-wrap gap-2 md:flex-col md:flex-nowrap md:gap-0 md:border-l md:border-border">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm md:-ml-px md:rounded-l-none md:border-l-2 md:py-1.5 ${
                    active
                      ? "border-primary bg-muted font-medium text-foreground md:border-l-primary"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
