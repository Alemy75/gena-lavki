/**
 * Рендер schema.org-разметки. `<` экранируется, чтобы данные из БД
 * не могли закрыть тег <script> (рекомендация из гайда Next по JSON-LD).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
