"use client";

import { useContactModal } from "@/components/contact-modal";

export function ContactCta() {
  const { open } = useContactModal();

  return (
    <section
      className="mt-10 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4"
      aria-label="Обратная связь"
    >
      <p className="mb-3 text-sm text-foreground-soft sm:mb-0">
        Есть вопросы по каталогу или хотите обсудить заказ?
      </p>
      <button
        type="button"
        onClick={() => open()}
        className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
      >
        Связаться с нами
      </button>
    </section>
  );
}
