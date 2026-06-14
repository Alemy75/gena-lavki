"use client";

import { useContactModal } from "@/components/contact-modal";

/** Кнопка под галереей на странице товара: открывает модалку с привязкой к позиции. */
export function ProductContactButton({ product }: { product: string }) {
  const { open } = useContactModal();

  return (
    <button
      type="button"
      onClick={() => open({ product })}
      className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      Связаться по этому товару
    </button>
  );
}
