"use client";

import { useState } from "react";

export function RestoreForm() {
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function restore() {
    if (!file) {
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/gzip" },
        body: file,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      setResult({
        ok: true,
        text: "Восстановление завершено: база данных и файлы заменены данными из бэкапа.",
      });
      setFile(null);
      setConfirmed(false);
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : "Ошибка восстановления" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-danger-border bg-danger-surface p-4">
      <h3 className="mb-2 text-base font-medium text-foreground">Восстановление из бэкапа</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Загрузите бандл <code>.tgz</code>, скачанный на этой странице (или собранный{" "}
        <code>scripts/backup.sh</code>). Текущие база данных и загруженные файлы будут{" "}
        <strong>безвозвратно перезаписаны</strong> — сначала скачайте свежий бэкап выше.
        Операция занимает до минуты, сайт в это время может быть недоступен.
      </p>

      <input
        type="file"
        accept=".tgz,application/gzip"
        disabled={busy}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="mb-3 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-muted-strong file:px-2 file:py-1"
      />

      <label className="mb-4 flex items-start gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={busy}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        Я понимаю, что текущие данные будут перезаписаны
      </label>

      <div>
        <button
          type="button"
          disabled={!file || !confirmed || busy}
          onClick={() => void restore()}
          className="inline-flex items-center rounded-lg bg-danger px-4 py-2 text-sm font-medium text-danger-foreground transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Восстанавливаю…" : "Восстановить из бэкапа"}
        </button>
      </div>

      {result ? (
        <p className={`mt-4 text-sm ${result.ok ? "text-foreground" : "text-danger"}`}>
          {result.text}
        </p>
      ) : null}
    </section>
  );
}
