"use client";

import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type Category = {
  id: number;
  name: string;
  sortOrder: number;
};

type CatalogItem = {
  id: number;
  name: string;
  description: string;
  image: string;
  createdAt: string;
  categoryId: number | null;
  category: { id: number; name: string } | null;
};

function CategoryRow({
  category,
  onChanged,
  onError,
}: {
  category: Category;
  onChanged: () => void;
  onError: (text: string) => void;
}) {
  const [name, setName] = useState(category.name);
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(category.name);
    setSortOrder(String(category.sortOrder));
  }, [category]);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          sortOrder: Number.parseInt(sortOrder, 10) || 0,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Удалить категорию «${category.name}»? Позиции останутся без категории.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? res.statusText);
      }
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 border-b border-zinc-200 py-3 last:border-0 dark:border-zinc-800 sm:flex-row sm:items-end sm:gap-3">
      <div className="min-w-0 flex-1">
        <label className="mb-1 block text-xs text-zinc-500">Название</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
      </div>
      <div className="w-24 shrink-0">
        <label className="mb-1 block text-xs text-zinc-500">Порядок</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
        >
          Сохранить
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:text-red-400"
        >
          Удалить
        </button>
      </div>
    </li>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSort, setNewCatSort] = useState("0");
  const [catSaving, setCatSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) {
        throw new Error("Не удалось загрузить категории");
      }
      const data = (await res.json()) as Category[];
      setCategories(data);
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка категорий",
      });
    } finally {
      setCatLoading(false);
    }
  }, []);

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
    void loadCategories();
    void loadItems();
  }, [loadCategories, loadItems]);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const n = newCatName.trim();
    if (!n) {
      setMessage({ type: "err", text: "Введите название категории" });
      return;
    }
    setCatSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: n,
          sortOrder: Number.parseInt(newCatSort, 10) || 0,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      setNewCatName("");
      setNewCatSort("0");
      setMessage({ type: "ok", text: "Категория добавлена" });
      await loadCategories();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка",
      });
    } finally {
      setCatSaving(false);
    }
  }

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
      formData.append("description", description.trim());
      formData.append("image", file);
      if (itemCategoryId !== "") {
        formData.append("categoryId", itemCategoryId);
      }
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
      setDescription("");
      setItemCategoryId("");
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

  async function patchItemCategory(itemId: number, categoryId: string) {
    setMessage(null);
    try {
      const body =
        categoryId === ""
          ? { categoryId: null }
          : { categoryId: Number.parseInt(categoryId, 10) };
      const res = await fetch(`/api/catalog-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      await loadItems();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Не удалось сменить категорию",
      });
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
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

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium">Категории</h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Порядок влияет на отображение в сайдбаре на главной странице.
        </p>
        <form
          onSubmit={handleAddCategory}
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end dark:border-zinc-800 dark:bg-zinc-900/80"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="new-cat-name" className="mb-1 block text-sm font-medium">
              Новая категория
            </label>
            <input
              id="new-cat-name"
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Название"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div className="w-28">
            <label htmlFor="new-cat-sort" className="mb-1 block text-sm font-medium">
              Порядок
            </label>
            <input
              id="new-cat-sort"
              type="number"
              value={newCatSort}
              onChange={(e) => setNewCatSort(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <button
            type="submit"
            disabled={catSaving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {catSaving ? "…" : "Добавить"}
          </button>
        </form>
        {catLoading ? (
          <p className="text-sm text-zinc-500">Загрузка категорий…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-zinc-500">Категорий пока нет.</p>
        ) : (
          <ul className="rounded-xl border border-zinc-200 px-4 dark:border-zinc-800">
            {categories.map((c) => (
              <CategoryRow
                key={c.id}
                category={c}
                onChanged={() => {
                  void loadCategories();
                  void loadItems();
                }}
                onError={(text) => setMessage({ type: "err", text })}
              />
            ))}
          </ul>
        )}
      </section>

      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        Добавление позиций: название, описание (необязательно), категория (необязательно) и файл
        картинки (до 5 МБ, JPEG/PNG/WebP/GIF).
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
          <label htmlFor="item-description" className="mb-1 block text-sm font-medium">
            Описание
          </label>
          <textarea
            id="item-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Текст для страницы позиции"
            className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label htmlFor="item-category" className="mb-1 block text-sm font-medium">
            Категория
          </label>
          <select
            id="item-category"
            value={itemCategoryId}
            onChange={(e) => setItemCategoryId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            <option value="">Без категории</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
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
                className="flex flex-col gap-3 px-4 py-3 text-sm first:rounded-t-xl last:rounded-b-xl sm:flex-row sm:items-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt=""
                  className="size-10 shrink-0 rounded object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.name}</span>
                  {item.description.trim() ? (
                    <span className="mt-0.5 line-clamp-2 block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      {item.description}
                    </span>
                  ) : null}
                </span>
                <div className="flex shrink-0 items-center gap-2 sm:w-56">
                  <label htmlFor={`cat-${item.id}`} className="sr-only">
                    Категория для {item.name}
                  </label>
                  <select
                    id={`cat-${item.id}`}
                    value={item.categoryId === null ? "" : String(item.categoryId)}
                    onChange={(e) => void patchItemCategory(item.id, e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-950"
                  >
                    <option value="">Без категории</option>
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="shrink-0 text-zinc-400">#{item.id}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
