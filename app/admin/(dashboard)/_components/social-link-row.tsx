"use client";

import { useEffect, useState } from "react";
import type { SocialLink } from "../types";

export function SocialLinkRow({
  link,
  onChanged,
  onError,
}: {
  link: SocialLink;
  onChanged: () => void;
  onError: (text: string) => void;
}) {
  const [label, setLabel] = useState(link.label);
  const [url, setUrl] = useState(link.url);
  const [sortOrder, setSortOrder] = useState(String(link.sortOrder));
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLabel(link.label);
    setUrl(link.url);
    setSortOrder(String(link.sortOrder));
    setIconFile(null);
  }, [link]);

  async function save() {
    setBusy(true);
    try {
      if (iconFile) {
        const fd = new FormData();
        fd.append("label", label.trim());
        fd.append("url", url.trim());
        fd.append("sortOrder", sortOrder);
        fd.append("icon", iconFile);
        const res = await fetch(`/api/social-links/${link.id}`, {
          method: "PATCH",
          body: fd,
          credentials: "include",
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? res.statusText);
        }
      } else {
        const res = await fetch(`/api/social-links/${link.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            label: label.trim(),
            url: url.trim(),
            sortOrder: Number.parseInt(sortOrder, 10) || 0,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? res.statusText);
        }
      }
      setIconFile(null);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Удалить «${link.label}»?`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/social-links/${link.id}`, {
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
    <li className="flex flex-col gap-3 border-b border-border py-4 last:border-0">
      <div className="flex flex-wrap items-start gap-3">
        {link.icon ? (
          <div className="shrink-0 rounded border border-border bg-background p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={link.icon} alt="" className="size-10 object-contain" />
          </div>
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded border border-dashed border-input-border text-xs text-muted-foreground">
            нет
          </div>
        )}
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Подпись</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Ссылка</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted-foreground">
              Новая иконка (JPEG, PNG, WebP, GIF, SVG, до 5 МБ)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,.svg"
              onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-muted-strong file:px-2 file:py-1"
            />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs text-muted-foreground">Порядок</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
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
