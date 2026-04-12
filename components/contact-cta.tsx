"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950";

export function ContactCta() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successHint, setSuccessHint] = useState<string | null>(null);

  const open = useCallback(() => {
    setError(null);
    setSuccess(false);
    setSuccessHint(null);
    dialogRef.current?.showModal();
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        dialog.close();
      }
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 55_000);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, consent }),
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        error?: string;
        savedWithoutMail?: boolean;
        message?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Не удалось отправить");
        return;
      }
      if (data.savedWithoutMail) {
        setSuccessHint(
          data.message ??
            "Заявка сохранена. Письмо не отправилось из‑за сети; мы свяжемся с вами по указанным контактам.",
        );
      } else {
        setSuccessHint(null);
      }
      setSuccess(true);
      setName("");
      setEmail("");
      setPhone("");
      setConsent(false);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("Превышено время ожидания. Проверьте соединение или попробуйте позже.");
      } else {
        setError("Сеть недоступна. Попробуйте позже.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setSubmitting(false);
    }
  }

  return (
    <>
      <section
        className="mt-10 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:flex sm:items-center sm:justify-between sm:gap-4"
        aria-label="Обратная связь"
      >
        <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300 sm:mb-0">
          Есть вопросы по каталогу или хотите обсудить заказ?
        </p>
        <button
          type="button"
          onClick={open}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Связаться с нами
        </button>
      </section>

      <dialog
        ref={dialogRef}
        className="contact-dialog rounded-2xl border-zinc-200 bg-white text-zinc-900 open:flex open:flex-col dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
        aria-labelledby="contact-dialog-title"
      >
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-3">
            <h2 id="contact-dialog-title" className="text-lg font-semibold tracking-tight">
              Связаться с нами
            </h2>
            <button
              type="button"
              onClick={close}
              className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
        </div>

        {success ? (
          <div className="px-5 py-6">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {successHint ??
                "Сообщение отправлено. Мы свяжемся с вами по указанным контактам."}
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col px-5 py-5">
            <div className="space-y-4">
              <div>
                <label htmlFor="contact-name" className="mb-1 block text-sm font-medium">
                  Как к вам обращаться
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={200}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="mb-1 block text-sm font-medium">
                  Почта
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="contact-phone" className="mb-1 block text-sm font-medium">
                  Телефон
                </label>
                <input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  maxLength={50}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 dark:border-zinc-600"
                />
                <span className="text-zinc-700 dark:text-zinc-300">
                  Согласен на обработку персональных данных
                </span>
              </label>
            </div>

            {error ? (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !consent}
              className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {submitting ? "Отправка…" : "Отправить"}
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}
