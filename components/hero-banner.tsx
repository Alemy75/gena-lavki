"use client";

import { useContactModal } from "@/components/contact-modal";

export function HeroBanner() {
  const { open } = useContactModal();

  return (
    <section
      aria-label="О мастерской"
      className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
    >
      <div className="relative z-10 max-w-2xl px-6 py-10 sm:px-8 sm:py-12 md:pr-48">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Лавки и садовая мебель ручной работы
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
          Делаем уличные лавки, скамьи и мебель для сада и дачи. Подберём
          размер, цвет и форму под ваше место — напишите нам, обсудим заказ.
        </p>
        <button
          type="button"
          onClick={() => open()}
          className="mt-6 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Связаться с нами
        </button>
      </div>
      {/* Левая половина картинки у правого края: сдвиг вправо на половину собственной ширины */}
      {/* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */}
      <img
        src="/hero-bench.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 hidden h-[180%] w-auto max-w-none -translate-y-1/2 translate-x-1/2 select-none md:block"
      />
    </section>
  );
}
