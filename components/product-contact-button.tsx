"use client";

import { useContactModal } from "@/components/contact-modal";

/** Кнопка под галереей на странице товара: открывает модалку с привязкой к позиции. */
export function ProductContactButton({ product }: { product: string }) {
  const { open } = useContactModal();

  return (
    <button
      type="button"
      onClick={() => open({ product })}
      className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
    >
      Связаться по этому товару
    </button>
  );
}
