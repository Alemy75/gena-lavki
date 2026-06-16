import Link from "next/link";

const FEATURES = [
  "По всей России — СДЭК, Деловые Линии, ПЭК",
  "Самовывоз со склада в Москве — бесплатно",
  "Сроки и стоимость рассчитаем под ваш заказ",
];

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="mt-0.5 size-4 shrink-0 text-primary"
    >
      <path
        fill="currentColor"
        d="M8.143 15.071 3.928 10.857l1.414-1.414 2.8 2.8 6.515-6.515 1.414 1.414z"
      />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg
      viewBox="0 0 64 48"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-32 text-primary/70 sm:size-40 md:size-48"
    >
      <rect x="3" y="14" width="36" height="22" rx="2" />
      <path d="M39 20 H52 L60 28 V36 H39 Z" />
      <path d="M3 28 H39" />
      <circle cx="16" cy="40" r="4" />
      <circle cx="48" cy="40" r="4" />
    </svg>
  );
}

/** Большой баннер «Доставка» на главной — заголовок, преимущества, CTA на /info/delivery. */
export function DeliveryBanner() {
  return (
    <section
      aria-label="Доставка"
      className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8 dark:shadow-sm"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_50%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_55%)]"
      />

      <div className="relative grid gap-6 sm:gap-8 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-primary"
            />
            Доставка
          </span>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Привезём заказ к вам
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Отправляем по всей России через транспортные компании. Точную
            стоимость и сроки рассчитываем индивидуально под каждый заказ.
          </p>

          <ul className="mt-4 space-y-1.5 text-sm text-foreground-soft">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/info/delivery"
            className="mt-6 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30 transition hover:bg-primary-hover"
          >
            Подробнее о доставке →
          </Link>
        </div>

        <div className="hidden shrink-0 items-center justify-center md:flex">
          <TruckIcon />
        </div>
      </div>
    </section>
  );
}
