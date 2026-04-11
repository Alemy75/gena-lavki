"use client";

import { useCallback, useEffect, useState } from "react";
import { CategoryRow } from "../_components/category-row";
import type { Category } from "../types";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSort, setNewCatSort] = useState("0");
  const [catSaving, setCatSaving] = useState(false);
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

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

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

  return (
    <div>
      <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">Категории</h2>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
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

      {message ? (
        <p
          className={
            message.type === "ok"
              ? "mb-4 text-sm text-emerald-600 dark:text-emerald-400"
              : "mb-4 text-sm text-red-600 dark:text-red-400"
          }
          role="alert"
        >
          {message.text}
        </p>
      ) : null}

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
              onChanged={() => void loadCategories()}
              onError={(text) => setMessage({ type: "err", text })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
