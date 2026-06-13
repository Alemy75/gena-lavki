import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Единый рендер Markdown для описаний товаров.
 * Используется и на странице товара, и в превью редактора в админке —
 * чтобы автор видел ровно то, что получит посетитель.
 * Сырой HTML не рендерится (react-markdown по умолчанию его игнорирует) — безопасно от XSS.
 */

const components: Components = {
  h1: (props) => (
    <h2
      className="mt-6 mb-2 text-xl font-semibold tracking-tight text-zinc-900 first:mt-0 dark:text-zinc-50"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="mt-6 mb-2 text-xl font-semibold tracking-tight text-zinc-900 first:mt-0 dark:text-zinc-50"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="mt-5 mb-2 text-base font-semibold tracking-tight text-zinc-900 first:mt-0 dark:text-zinc-100"
      {...props}
    />
  ),
  p: (props) => <p className="my-3 first:mt-0 last:mb-0" {...props} />,
  ul: (props) => (
    <ul className="my-3 list-disc space-y-1 pl-5 marker:text-zinc-400" {...props} />
  ),
  ol: (props) => (
    <ol className="my-3 list-decimal space-y-1 pl-5 marker:text-zinc-400" {...props} />
  ),
  li: (props) => <li className="leading-relaxed" {...props} />,
  strong: (props) => (
    <strong className="font-semibold text-zinc-900 dark:text-zinc-100" {...props} />
  ),
  em: (props) => <em className="italic" {...props} />,
  a: (props) => (
    <a
      className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  hr: () => <hr className="my-6 border-zinc-200 dark:border-zinc-800" />,
  blockquote: (props) => (
    <blockquote
      className="my-3 border-l-2 border-zinc-300 pl-4 italic text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
      {...props}
    />
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
