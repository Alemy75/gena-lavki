import type { ReactNode } from "react";

/** Единая ширина с шапкой и подвалом: `max-w-6xl`, контент и сайдбар на всю ширину контейнера */
export function CatalogPageShell({
  hero,
  sidebar,
  children,
}: {
  hero?: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {hero ? <div className="mb-6 md:mb-8">{hero}</div> : null}
      <div className="flex w-full flex-col gap-6 md:flex-row md:items-start md:gap-8">
        {sidebar}
        <div className="min-w-0 w-full flex-1">{children}</div>
      </div>
    </div>
  );
}
