"use client";

import { useContactModal } from "@/components/contact-modal";

export function HeroBanner() {
  const { open } = useContactModal();

  return (
    <section
      aria-label="О мастерской"
      className="relative overflow-hidden rounded-2xl border border-border bg-surface dark:shadow-sm"
    >
      <div className="relative z-10 px-6 py-10 text-center sm:px-8 sm:py-12 md:max-w-2xl md:pr-48 md:text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Лавки и садовая мебель ручной работы
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base md:mx-0">
          Делаем уличные лавки, скамьи и мебель для сада и дачи. Подберём
          размер, цвет и форму под ваше место — напишите нам, обсудим заказ.
        </p>
        <button
          type="button"
          onClick={() => open()}
          className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
        >
          Связаться с нами
        </button>

        {/* Мобилка: картинка по центру снизу */}
        {/* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */}
        <img
          src="/hero-bench.png"
          alt=""
          aria-hidden="true"
          className="mx-auto mt-8 w-64 max-w-full select-none md:hidden"
        />
      </div>
      {/* Десктоп: картинка у правого края, за край уходит ~1/3 ширины */}
      {/* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */}
      <img
        src="/hero-bench.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 hidden h-[180%] w-auto max-w-none -translate-y-1/2 translate-x-1/3 select-none md:block"
      />
    </section>
  );
}
