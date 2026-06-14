"use client";

import { useContactModal } from "@/components/contact-modal";

/** Кнопка «Связаться с нами» в шапке — открывает общую модалку обратной связи. */
export function HeaderContactButton() {
  const { open } = useContactModal();

  return (
    <button
      type="button"
      onClick={() => open()}
      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
    >
      Связаться с нами
    </button>
  );
}
