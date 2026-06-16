"use client";

import { useCallback, useEffect, useState } from "react";
import { MarkdownEditor } from "@/components/markdown-editor";
import type { PageEntry } from "../types";

type FullPage = Required<PageEntry>;

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FullPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pages");
      if (!res.ok) {
        throw new Error("Не удалось загрузить страницы");
      }
      const data = (await res.json()) as PageEntry[];
      setPages(data);
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
    void loadPages();
  }, [loadPages]);

  async function startEditing(slug: string) {
    setMessage(null);
    try {
      const res = await fetch(`/api/pages/${slug}`);
      if (!res.ok) {
        throw new Error("Не удалось открыть страницу");
      }
      const data = (await res.json()) as FullPage;
      setEditing(data);
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка",
      });
    }
  }

  async function saveEditing() {
    if (!editing) return;
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/pages/${editing.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: editing.title, content: editing.content }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      setMessage({ type: "ok", text: "Страница сохранена" });
      setEditing(null);
      await loadPages();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Не удалось сохранить",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-lg font-medium text-foreground">Страницы</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Информационные страницы сайта (доставка, гарантия и т.п.). Контент в
        Markdown — поддерживаются заголовки, списки, таблицы. Публичный адрес:{" "}
        <code className="text-foreground-soft">/info/&lt;slug&gt;</code>.
      </p>

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

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка списка…</p>
      ) : pages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Страниц пока нет.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {pages.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 px-4 py-3 text-sm first:rounded-t-xl last:rounded-b-xl sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <span className="block font-medium">{p.title}</span>
                <span className="text-xs text-muted-foreground">
                  /info/{p.slug}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={`/info/${p.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Открыть
                </a>
                <button
                  type="button"
                  onClick={() => void startEditing(p.slug)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
                >
                  Редактировать
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-6 dark:shadow-sm">
          <h3 className="text-base font-medium text-foreground">
            Редактирование: <span className="text-muted-foreground">/info/{editing.slug}</span>
          </h3>
          <div>
            <label htmlFor="page-title" className="mb-1 block text-sm font-medium">
              Заголовок
            </label>
            <input
              id="page-title"
              type="text"
              value={editing.title}
              onChange={(e) =>
                setEditing({ ...editing, title: e.target.value })
              }
              maxLength={200}
              className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="page-content" className="mb-1 block text-sm font-medium">
              Контент (Markdown)
            </label>
            <MarkdownEditor
              id="page-content"
              value={editing.content}
              onChange={(content) => setEditing({ ...editing, content })}
              rows={14}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving || !editing.title.trim()}
              onClick={() => void saveEditing()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
