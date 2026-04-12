"use client";

import { useCallback, useEffect, useState } from "react";
import type { CatalogItem, CatalogItemImage, Category } from "../types";

function sortedImages(item: CatalogItem): CatalogItemImage[] {
  const list = item.images;
  if (!list || list.length === 0) {
    return [];
  }
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
}

function coverUrl(item: CatalogItem): string {
  const imgs = sortedImages(item);
  return imgs[0]?.url ?? item.image;
}

export default function AdminItemsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const loadCategories = useCallback(async () => {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (files.length === 0) {
      setMessage({ type: "err", text: "Выберите хотя бы одно изображение" });
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      for (const f of files) {
        formData.append("images", f);
      }
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
      setFiles([]);
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

  async function addPhotosToItem(itemId: number, fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }
    setMessage(null);
    try {
      const formData = new FormData();
      for (const f of Array.from(fileList)) {
        formData.append("images", f);
      }
      const res = await fetch(`/api/catalog-items/${itemId}/images`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      await loadItems();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Не удалось добавить фото",
      });
    }
  }

  async function deleteItemImage(itemId: number, imageId: number) {
    setMessage(null);
    try {
      const res = await fetch(`/api/catalog-items/${itemId}/images/${imageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      await loadItems();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Не удалось удалить фото",
      });
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

  return (
    <div>
      <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">Позиции</h2>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Добавление: название, описание (необязательно), категория (необязательно) и одно или несколько
        изображений (до 5 МБ каждое, JPEG/PNG/WebP/GIF). Первое фото — обложка в списке.
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
            Изображения
          </label>
          <input
            id="item-image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            required
            onChange={(e) =>
              setFiles(e.target.files ? Array.from(e.target.files) : [])
            }
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
        <h3 className="mb-3 flex flex-wrap items-center gap-2 text-base font-medium text-zinc-900 dark:text-zinc-50">
          <span>Текущие позиции</span>
          <span className="text-zinc-500 dark:text-zinc-400">
            ({loading ? "…" : items.length})
          </span>
        </h3>
        {loading ? (
          <p className="text-sm text-zinc-500">Загрузка списка…</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {items.map((item) => {
              const imgs = sortedImages(item);
              return (
              <li
                key={item.id}
                className="flex flex-col gap-3 px-4 py-3 text-sm first:rounded-t-xl last:rounded-b-xl sm:flex-row sm:items-start"
              >
                <div className="flex shrink-0 flex-col gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl(item)}
                    alt=""
                    className="size-10 rounded object-cover"
                  />
                  {imgs.length > 1 ? (
                    <ul className="flex max-w-[140px] flex-wrap gap-1">
                      {imgs.map((im) => (
                        <li key={im.id} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={im.url}
                            alt=""
                            className="size-7 rounded object-cover ring-1 ring-zinc-200 dark:ring-zinc-600"
                          />
                          <button
                            type="button"
                            title="Удалить фото"
                            onClick={() => void deleteItemImage(item.id, im.id)}
                            className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold leading-none text-white shadow disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <label className="cursor-pointer text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200">
                    + фото
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        void addPhotosToItem(item.id, e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.name}</span>
                  {item.description.trim() ? (
                    <span className="mt-0.5 line-clamp-2 block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      {item.description}
                    </span>
                  ) : null}
                </span>
                <div className="flex shrink-0 items-center gap-2 sm:w-56 sm:self-center">
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
                <span className="shrink-0 self-center text-zinc-400">#{item.id}</span>
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
