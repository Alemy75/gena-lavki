"use client";

import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type CatalogItem = {
  id: number;
  name: string;
  image: string;
  createdAt: string;
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/catalog-items");
      if (!res.ok) {
        throw new Error("Не удалось загрузить список");
      }
      const data = (await res.json()) as CatalogItem[];
      setItems(data);
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка загрузки",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!file) {
      setMessage({ type: "err", text: "Выберите файл изображения" });
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("image", file);
      const res = await fetch("/api/catalog-items", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      setName("");
      setFile(null);
      setMessage({ type: "ok", text: "Позиция добавлена" });
      await loadItems();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка сохранения",
      });
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="px-4 py-12 text-center text-sm text-zinc-500">Загрузка…</div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Админка каталога
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {session.user?.email}
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
        >
          Выйти
        </button>
      </div>

      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        Добавление позиций: название и файл картинки (до 5 МБ, JPEG/PNG/WebP/GIF).
      </p>

      <form
        onSubmit={handleSubmit}
        className="mb-10 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
      >
        <div>
          <label htmlFor="item-name" className="mb-1 block text-sm font-medium">
            Название
          </label>
          <input
            id="item-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label htmlFor="item-image" className="mb-1 block text-sm font-medium">
            Изображение
          </label>
          <input
            id="item-image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 dark:file:bg-zinc-700"
          />
        </div>
        {message ? (
          <p
            className={
              message.type === "ok"
                ? "text-sm text-emerald-600 dark:text-emerald-400"
                : "text-sm text-red-600 dark:text-red-400"
            }
            role="alert"
          >
            {message.text}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {saving ? "Сохранение…" : "Добавить"}
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-lg font-medium">Текущие позиции ({items.length})</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Загрузка…</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 text-sm first:rounded-t-xl last:rounded-b-xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt=""
                  className="size-10 shrink-0 rounded object-cover"
                />
                <span className="min-w-0 flex-1 font-medium">{item.name}</span>
                <span className="shrink-0 text-zinc-400">#{item.id}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
