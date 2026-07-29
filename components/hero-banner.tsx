"use client";

import { useContactModal } from "@/components/contact-modal";

export function HeroBanner() {
  const { open } = useContactModal();

  return (
    <section
      aria-label="О мастерской"
      className="relative overflow-hidden rounded-2xl border border-border bg-surface dark:shadow-sm"
    >
      <div className="relative z-10 px-6 pt-10 pb-72 text-center sm:px-8 sm:pt-12 md:max-w-2xl md:py-12 md:pr-48 md:text-left">
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
      </div>
      {/* Мобилка: лавка во всю ширину снизу, центральная часть закрывает низ карточки,
          края и низ уходят за границы (обрезаются overflow-hidden карточки) */}
      {/* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */}
      <img
        src="/hero-bench.webp"
        alt=""
        aria-hidden="true"
        width={640}
        height={640}
        fetchPriority="high"
        className="pointer-events-none absolute bottom-0 left-1/2 w-[120%] max-w-none -translate-x-1/2 translate-y-[20%] select-none md:hidden"
      />
      {/* Десктоп: картинка у правого края, за край уходит ~1/3 ширины */}
      {/* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */}
      <img
        src="/hero-bench.webp"
        alt=""
        aria-hidden="true"
        width={640}
        height={640}
        fetchPriority="high"
        className="pointer-events-none absolute right-0 top-1/2 hidden h-[180%] w-auto max-w-none -translate-y-1/2 translate-x-1/3 select-none md:block"
      />
    </section>
  );
}
