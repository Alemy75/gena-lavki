"use client";

import { useEffect, useState } from "react";
import type { Category } from "../types";

export function CategoryRow({
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
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-0 sm:flex-row sm:items-end sm:gap-3">
      <div className="min-w-0 flex-1">
        <label className="mb-1 block text-xs text-muted-foreground">Название</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
        />
      </div>
      <div className="w-24 shrink-0">
        <label className="mb-1 block text-xs text-muted-foreground">Порядок</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
        />
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg border border-input-border px-3 py-2 text-sm"
        >
          Сохранить
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="rounded-lg border border-danger-border px-3 py-2 text-sm text-danger"
        >
          Удалить
        </button>
      </div>
    </li>
  );
}
