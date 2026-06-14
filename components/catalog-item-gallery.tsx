"use client";

import { useState } from "react";

type Props = {
  urls: string[];
  alt: string;
};

export function CatalogItemGallery({ urls, alt }: Props) {
  const list = urls.length > 0 ? urls : [];
  const [active, setActive] = useState(0);
  if (list.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
        Нет изображения
      </div>
    );
  }
  const safeIndex = Math.min(active, list.length - 1);
  const mainSrc = list[safeIndex] ?? list[0];

  return (
    <div className="w-full">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mainSrc} alt={alt} className="h-full w-full object-cover" />
      </div>
      {list.length > 1 ? (
        <ul
          className="mt-3 grid grid-cols-6 gap-1.5 sm:gap-2"
          role="tablist"
          aria-label="Дополнительные фото"
        >
          {list.map((url, i) => (
            <li key={`${url}-${i}`} className="aspect-square min-w-0">
              <button
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                onClick={() => setActive(i)}
                className={`h-full w-full overflow-hidden rounded-md ${
                  i === safeIndex
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                    : "opacity-80 ring-1 ring-border hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
