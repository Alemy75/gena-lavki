"use client";

import { useCallback, useEffect, useState } from "react";

type HomeContentDto = {
  heroTitle: string;
  heroText: string;
  deliveryTitle: string;
  deliveryText: string;
  deliveryFeatures: string;
};

export default function AdminHomePage() {
  const [form, setForm] = useState<HomeContentDto>({
    heroTitle: "",
    heroText: "",
    deliveryTitle: "",
    deliveryText: "",
    deliveryFeatures: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/home-content");
      if (!res.ok) {
        throw new Error("Не удалось загрузить тексты");
      }
      const data = (await res.json()) as Partial<HomeContentDto>;
      setForm({
        heroTitle: data.heroTitle ?? "",
        heroText: data.heroText ?? "",
        deliveryTitle: data.deliveryTitle ?? "",
        deliveryText: data.deliveryText ?? "",
        deliveryFeatures: data.deliveryFeatures ?? "",
      });
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
    void load();
  }, [load]);

  function field(key: keyof HomeContentDto) {
    return {
      value: form[key],
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/home-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? res.statusText);
      }
      setMessage({ type: "ok", text: "Тексты баннеров сохранены" });
      await load();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Ошибка сохранения",
      });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm";

  return (
    <div>
      <h2 className="mb-2 text-lg font-medium text-foreground">Главная страница</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Тексты двух баннеров на главной. Если оставить заголовок или описание
        пустым, покажется текст по умолчанию. Пункты доставки — по одному на
        строку; уберите все строки, и список исчезнет.
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
        <p className="text-sm text-muted-foreground">Загрузка текстов…</p>
      ) : (
        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-2xl border border-border bg-surface p-6 dark:shadow-sm"
        >
          <div className="space-y-4">
            <h3 className="text-base font-medium text-foreground">Главный баннер</h3>
            <div>
              <label htmlFor="hero-title" className="mb-1 block text-sm font-medium">
                Заголовок
              </label>
              <input id="hero-title" type="text" className={inputClass} {...field("heroTitle")} />
            </div>
            <div>
              <label htmlFor="hero-text" className="mb-1 block text-sm font-medium">
                Описание
              </label>
              <textarea
                id="hero-text"
                rows={3}
                className={`${inputClass} resize-y`}
                {...field("heroText")}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-medium text-foreground">Баннер доставки</h3>
            <div>
              <label htmlFor="delivery-title" className="mb-1 block text-sm font-medium">
                Заголовок
              </label>
              <input
                id="delivery-title"
                type="text"
                className={inputClass}
                {...field("deliveryTitle")}
              />
            </div>
            <div>
              <label htmlFor="delivery-text" className="mb-1 block text-sm font-medium">
                Описание
              </label>
              <textarea
                id="delivery-text"
                rows={3}
                className={`${inputClass} resize-y`}
                {...field("deliveryText")}
              />
            </div>
            <div>
              <label
                htmlFor="delivery-features"
                className="mb-1 block text-sm font-medium"
              >
                Пункты списка — по одному на строку
              </label>
              <textarea
                id="delivery-features"
                rows={5}
                className={`${inputClass} resize-y`}
                {...field("deliveryFeatures")}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить тексты"}
          </button>
        </form>
      )}
    </div>
  );
}
