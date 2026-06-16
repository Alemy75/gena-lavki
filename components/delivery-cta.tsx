import Link from "next/link";

/**
 * Карточка-ссылка на страницу доставки.
 * Используется на главной (секция) и на странице товара (сноска внизу).
 * Текст можно переопределить через title/description.
 */
export function DeliveryCta({
  title = "Доставка по России",
  description = "Рассчитаем стоимость и сроки под ваш заказ.",
  cta = "Подробнее о доставке →",
  className,
}: {
  title?: string;
  description?: string;
  cta?: string;
  className?: string;
}) {
  return (
    <Link
      href="/info/delivery"
      aria-label={cta}
      className={[
        "block rounded-2xl border border-border bg-surface p-5 transition hover:border-primary dark:shadow-sm",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-base font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="shrink-0 text-sm font-medium text-primary">{cta}</span>
      </div>
    </Link>
  );
}
