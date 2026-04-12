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
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        Нет изображения
      </div>
    );
  }
  const safeIndex = Math.min(active, list.length - 1);
  const mainSrc = list[safeIndex] ?? list[0];

  return (
    <div className="w-full">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:ring-zinc-700">
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
                    ? "ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-zinc-100 dark:ring-offset-zinc-900"
                    : "opacity-80 ring-1 ring-zinc-200 hover:opacity-100 dark:ring-zinc-600"
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
