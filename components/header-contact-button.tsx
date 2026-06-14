"use client";

import { useContactModal } from "@/components/contact-modal";

/** Кнопка «Связаться с нами» в шапке — открывает общую модалку обратной связи. */
export function HeaderContactButton() {
  const { open } = useContactModal();

  return (
    <button
      type="button"
      onClick={() => open()}
      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      Связаться с нами
    </button>
  );
}
