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
      className="mt-6 mb-2 text-xl font-semibold tracking-tight text-foreground first:mt-0"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="mt-6 mb-2 text-xl font-semibold tracking-tight text-foreground first:mt-0"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="mt-5 mb-2 text-base font-semibold tracking-tight text-foreground first:mt-0"
      {...props}
    />
  ),
  p: (props) => <p className="my-3 first:mt-0 last:mb-0" {...props} />,
  ul: (props) => (
    <ul className="my-3 list-disc space-y-1 pl-5 marker:text-muted-foreground" {...props} />
  ),
  ol: (props) => (
    <ol className="my-3 list-decimal space-y-1 pl-5 marker:text-muted-foreground" {...props} />
  ),
  li: (props) => <li className="leading-relaxed" {...props} />,
  strong: (props) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: (props) => <em className="italic" {...props} />,
  a: (props) => (
    <a
      className="font-medium text-foreground underline underline-offset-2 hover:text-muted-foreground"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  hr: () => <hr className="my-6 border-border" />,
  blockquote: (props) => (
    <blockquote
      className="my-3 border-l-2 border-input-border pl-4 italic text-muted-foreground"
      {...props}
    />
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-base leading-relaxed text-foreground-soft">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
