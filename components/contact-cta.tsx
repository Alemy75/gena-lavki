"use client";

import { useContactModal } from "@/components/contact-modal";

export function ContactCta() {
  const { open } = useContactModal();

  return (
    <section
      className="mt-10 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:flex sm:items-center sm:justify-between sm:gap-4"
      aria-label="Обратная связь"
    >
      <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300 sm:mb-0">
        Есть вопросы по каталогу или хотите обсудить заказ?
      </p>
      <button
        type="button"
        onClick={() => open()}
        className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Связаться с нами
      </button>
    </section>
  );
}
