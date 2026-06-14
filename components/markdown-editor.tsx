"use client";

import { useRef, useState } from "react";
import { Markdown } from "@/components/markdown";

type Wrap = { before: string; after: string; placeholder: string };

const toolbar: { label: string; title: string; wrap: Wrap }[] = [
  { label: "Ж", title: "Жирный", wrap: { before: "**", after: "**", placeholder: "текст" } },
  { label: "К", title: "Курсив", wrap: { before: "_", after: "_", placeholder: "текст" } },
  {
    label: "H2",
    title: "Заголовок",
    wrap: { before: "## ", after: "", placeholder: "Заголовок" },
  },
  {
    label: "• Список",
    title: "Пункт списка",
    wrap: { before: "- ", after: "", placeholder: "пункт" },
  },
];

export function MarkdownEditor({
  value,
  onChange,
  id,
  rows = 10,
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  rows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(true);

  function applyWrap({ before, after, placeholder }: Wrap) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    // вернуть фокус и выделить вставленный текст
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    });
  }

  return (
    <div className="rounded-lg border border-input-border">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-1.5">
        {toolbar.map((b) => (
          <button
            key={b.label}
            type="button"
            title={b.title}
            onClick={() => applyWrap(b.wrap)}
            className="rounded px-2 py-1 text-xs font-medium text-foreground-soft hover:bg-muted"
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="ml-auto rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          {showPreview ? "Скрыть превью" : "Показать превью"}
        </button>
      </div>
      <div className={showPreview ? "grid gap-px bg-border md:grid-cols-2" : ""}>
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder="Описание в Markdown. ## Заголовок, **жирный**, - списки"
          className="w-full resize-y bg-input px-3 py-2 font-mono text-sm outline-none"
        />
        {showPreview ? (
          <div className="min-h-[6rem] overflow-auto bg-input px-3 py-2">
            {value.trim() ? (
              <Markdown>{value}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">Превью появится здесь</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
