"use client";

import { useContactModal } from "@/components/contact-modal";

export function HeroBanner() {
  const { open } = useContactModal();

  return (
    <section
      aria-label="О мастерской"
      className="relative overflow-hidden rounded-2xl border border-border bg-surface dark:shadow-sm"
    >
      {/* Мягкая зелёная подсветка фона за картинкой — даёт акцент без перегруза */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_50%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_55%)]"
      />

      <div className="relative z-10 px-6 pt-10 pb-72 text-center sm:px-8 sm:pt-12 md:max-w-2xl md:py-14 md:pr-48 md:text-left">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full bg-primary"
          />
          Ручная работа · доставка по России
        </span>

        <h1 className="mt-4 text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Лавки и садовая мебель{" "}
          <span className="text-primary">ручной работы</span>
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:mx-0">
          Делаем уличные лавки, скамьи и мебель для сада и дачи. Подберём
          размер, цвет и форму под ваше место — напишите нам, обсудим заказ.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 md:justify-start">
          <button
            type="button"
            onClick={() => open()}
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30 transition hover:bg-primary-hover"
          >
            Связаться с нами
          </button>
          <a
            href="#catalog"
            className="text-sm font-medium text-foreground-soft hover:text-foreground"
          >
            Смотреть каталог →
          </a>
        </div>
      </div>

      {/* Мобилка: лавка во всю ширину снизу, центральная часть закрывает низ карточки,
          края и низ уходят за границы (обрезаются overflow-hidden карточки) */}
      {/* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */}
      <img
        src="/hero-bench.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 z-0 w-[120%] max-w-none -translate-x-1/2 translate-y-[20%] select-none md:hidden"
      />
      {/* Десктоп: картинка у правого края, за край уходит ~1/3 ширины */}
      {/* eslint-disable-next-line @next/next/no-img-element -- native img per project preference */}
      <img
        src="/hero-bench.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 z-0 hidden h-[180%] w-auto max-w-none -translate-y-1/2 translate-x-1/3 select-none md:block"
      />
    </section>
  );
}
