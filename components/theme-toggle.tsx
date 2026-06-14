"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "Система" },
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
];

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Применяет тему к <html> (класс .dark) с учётом выбора «система». */
function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  // Подхватываем сохранённый выбор после монтирования (класс уже выставлен скриптом в <head>).
  // localStorage недоступен при SSR, поэтому читаем в эффекте — без риска hydration mismatch.
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme | null) ?? "system";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(saved);
  }, []);

  // Пока выбрана «система» — следуем за сменой темы ОС вживую.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function choose(next: Theme) {
    setTheme(next);
    localStorage.setItem("theme", next);
    apply(next);
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5"
      role="group"
      aria-label="Тема оформления"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => choose(o.value)}
          aria-pressed={theme === o.value}
          className={
            theme === o.value
              ? "rounded-md bg-surface px-2.5 py-1 text-xs font-medium text-foreground dark:shadow-sm"
              : "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
