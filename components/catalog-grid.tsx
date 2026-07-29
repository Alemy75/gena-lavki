import { productPath } from "@/lib/seo";
import Link from "next/link";

type GridItem = {
  id: number;
  name: string;
  image: string;
  category: { id: number; name: string } | null;
  images: { url: string }[];
};

/**
 * Сетка карточек каталога — общая для главной и категорийных страниц.
 * Первые карточки грузятся eager: на страницах без hero LCP-элемент —
 * именно картинка первой карточки, lazy её только задерживает.
 */
const EAGER_IMAGE_COUNT = 6;

export function CatalogGrid({ items }: { items: GridItem[] }) {
  return (
    <ul className="grid w-full list-none gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <li key={item.id}>
          <Link
            href={productPath(item)}
            className="block h-full rounded-2xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface dark:shadow-sm ring-border transition hover:border-input-border dark:hover:shadow-md">
              <div className="relative aspect-square w-full overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */}
                <img
                  src={item.images.length > 0 ? item.images[0]!.url : item.image}
                  alt={item.name}
                  loading={index < EAGER_IMAGE_COUNT ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : undefined}
                  decoding="async"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex-1 p-4">
                {item.category ? (
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {item.category.name}
                  </p>
                ) : null}
                <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                  {item.name}
                </h3>
              </div>
            </article>
          </Link>
        </li>
      ))}
    </ul>
  );
}
