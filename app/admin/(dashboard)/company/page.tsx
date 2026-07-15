"use client";

import { useCallback, useEffect, useState } from "react";
import { SocialLinkRow } from "../_components/social-link-row";
import type { SocialLink } from "../types";

export default function AdminCompanyPage() {
  const [siteName, setSiteName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [siteLoading, setSiteLoading] = useState(true);
  const [siteSaving, setSiteSaving] = useState(false);

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [socialLoading, setSocialLoading] = useState(true);
  const [newSocialLabel, setNewSocialLabel] = useState("");
  const [newSocialUrl, setNewSocialUrl] = useState("");
  const [newSocialSort, setNewSocialSort] = useState("0");
  const [newSocialFile, setNewSocialFile] = useState<File | null>(null);
  const [socialSaving, setSocialSaving] = useState(false);

  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const loadSiteSettings = useCallback(async () => {
    setSiteLoading(true);
    try {
      const res = await fetch("/api/site-settings");
      if (!res.ok) {
        throw new Error("Не удалось загрузить настройки");
      }
      const data = (await res.json()) as {
        siteName: string;
        phone: string;
        email: string;
        address: string;
      };
      setSiteName(data.siteName ?? "");
      setPhone(data.phone ?? "");
      setEmail(data.email ?? "");
      setAddress(data.address ?? "");
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка настроек",
      });
    } finally {
      setSiteLoading(false);
    }
  }, []);

  const loadSocialLinks = useCallback(async () => {
    setSocialLoading(true);
    try {
      const res = await fetch("/api/social-links");
      if (!res.ok) {
        throw new Error("Не удалось загрузить соцсети");
      }
      const data = (await res.json()) as SocialLink[];
      setSocialLinks(data);
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка соцсетей",
      });
    } finally {
      setSocialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSiteSettings();
    void loadSocialLinks();
  }, [loadSiteSettings, loadSocialLinks]);

  async function handleSaveSiteSettings(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSiteSaving(true);
    try {
      const res = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          siteName: siteName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      setMessage({ type: "ok", text: "Данные компании сохранены" });
      await loadSiteSettings();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка сохранения",
      });
    } finally {
      setSiteSaving(false);
    }
  }

  async function handleAddSocial(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const lab = newSocialLabel.trim();
    const u = newSocialUrl.trim();
    if (!lab || !u) {
      setMessage({ type: "err", text: "Укажите подпись и ссылку" });
      return;
    }
    setSocialSaving(true);
    try {
      const fd = new FormData();
      fd.append("label", lab);
      fd.append("url", u);
      fd.append("sortOrder", newSocialSort);
      if (newSocialFile) {
        fd.append("icon", newSocialFile);
      }
      const res = await fetch("/api/social-links", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      setNewSocialLabel("");
      setNewSocialUrl("");
      setNewSocialSort("0");
      setNewSocialFile(null);
      setMessage({ type: "ok", text: "Соцсеть добавлена" });
      await loadSocialLinks();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка",
      });
    } finally {
      setSocialSaving(false);
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-lg font-medium text-foreground">
        Данные компании
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Название сайта попадает в шапку, подвал и заголовки страниц в поиске.
        Телефон, почта и адрес показываются в шапке и подвале каждой страницы.
        Соцсети — с иконкой (файл до 5 МБ).
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

      {siteLoading ? (
        <p className="mb-8 text-sm text-muted-foreground">Загрузка контактов…</p>
      ) : (
        <form
          onSubmit={handleSaveSiteSettings}
          className="mb-8 space-y-4 rounded-2xl border border-border bg-surface p-6 dark:shadow-sm"
        >
          <div>
            <label htmlFor="site-name" className="mb-1 block text-sm font-medium">
              Название сайта
            </label>
            <input
              id="site-name"
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Название мастерской — шапка, title и «© …» в подвале"
              className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="site-phone" className="mb-1 block text-sm font-medium">
              Телефон
            </label>
            <input
              id="site-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (900) 000-00-00"
              className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="site-email" className="mb-1 block text-sm font-medium">
              Почта
            </label>
            <input
              id="site-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@example.ru"
              className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="site-address" className="mb-1 block text-sm font-medium">
              Адрес
            </label>
            <textarea
              id="site-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="Полный адрес, как на сайте"
              className="w-full resize-y rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={siteSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {siteSaving ? "Сохранение…" : "Сохранить контакты"}
          </button>
        </form>
      )}

      <h3 className="mb-3 text-base font-medium text-foreground">Соцсети</h3>
      <form
        onSubmit={handleAddSocial}
        className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 dark:shadow-sm"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="soc-label" className="mb-1 block text-sm font-medium">
              Подпись
            </label>
            <input
              id="soc-label"
              type="text"
              value={newSocialLabel}
              onChange={(e) => setNewSocialLabel(e.target.value)}
              placeholder="Например, Telegram"
              className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="soc-url" className="mb-1 block text-sm font-medium">
              Ссылка
            </label>
            <input
              id="soc-url"
              type="url"
              value={newSocialUrl}
              onChange={(e) => setNewSocialUrl(e.target.value)}
              placeholder="https://"
              className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-28">
            <label htmlFor="soc-sort" className="mb-1 block text-sm font-medium">
              Порядок
            </label>
            <input
              id="soc-sort"
              type="number"
              value={newSocialSort}
              onChange={(e) => setNewSocialSort(e.target.value)}
              className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="soc-icon" className="mb-1 block text-sm font-medium">
              Иконка (необязательно)
            </label>
            <input
              id="soc-icon"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,.svg"
              onChange={(e) => setNewSocialFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-muted-strong file:px-3 file:py-1.5"
            />
          </div>
          <button
            type="submit"
            disabled={socialSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {socialSaving ? "…" : "Добавить"}
          </button>
        </div>
      </form>

      {socialLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка соцсетей…</p>
      ) : socialLinks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Соцсетей пока нет.</p>
      ) : (
        <ul className="rounded-xl border border-border px-4">
          {socialLinks.map((sl) => (
            <SocialLinkRow
              key={sl.id}
              link={sl}
              onChanged={() => void loadSocialLinks()}
              onError={(text) => setMessage({ type: "err", text })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
