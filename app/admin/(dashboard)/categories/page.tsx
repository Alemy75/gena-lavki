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
      <h2 className="mb-2 text-lg font-medium text-foreground">Категории</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Порядок влияет на отображение в сайдбаре на главной странице.
      </p>

      <form
        onSubmit={handleAddCategory}
        className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 dark:shadow-sm sm:flex-row sm:items-end"
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
            className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
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
            className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={catSaving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {catSaving ? "…" : "Добавить"}
        </button>
      </form>

      {message ? (
        <p
          className={
            message.type === "ok"
              ? "mb-4 text-sm text-success"
              : "mb-4 text-sm text-danger"
          }
          role="alert"
        >
          {message.text}
        </p>
      ) : null}

      {catLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка категорий…</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">Категорий пока нет.</p>
      ) : (
        <ul className="rounded-xl border border-border px-4">
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
