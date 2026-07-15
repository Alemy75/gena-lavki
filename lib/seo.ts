/**
 * SEO-утилиты: ЧПУ-слаги (транслит кириллицы), канонические пути товаров
 * и категорий, выжимка plain-text из markdown для meta description.
 *
 * Слаг не хранится в БД: канонический URL всегда вычисляется из id + name,
 * а роуты 308-редиректят любой другой вид (`/catalog/12`, `/catalog/12-staroe-imya`)
 * на актуальный — id остаётся единственным источником истины.
 */

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

const SLUG_MAX_LENGTH = 80;

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, SLUG_MAX_LENGTH).replace(/-+$/, "");
}

/** Сегмент вида `12-skamya-sd`; для пустого слага — просто `12`. */
function idSlugSegment(id: number, name: string): string {
  const slug = slugify(name);
  return slug ? `${id}-${slug}` : String(id);
}

export function productPath(item: { id: number; name: string }): string {
  return `/catalog/${idSlugSegment(item.id, item.name)}`;
}

export function categoryPath(category: { id: number; name: string }): string {
  return `/category/${idSlugSegment(category.id, category.name)}`;
}

/**
 * Разбор сегмента `12-skamya-sd` | `12`. Возвращает id и присланный слаг
 * (для сравнения с каноническим), либо null для мусорных значений —
 * `1abc`, `01`, `1.5` и т.п. не должны отдавать 200 (пространство дублей).
 */
export function parseIdSlugSegment(
  segment: string,
): { id: number; slug: string } | null {
  const match = /^([1-9]\d*)(?:-([a-z0-9-]*))?$/.exec(segment);
  if (!match) {
    return null;
  }
  const id = Number.parseInt(match[1]!, 10);
  if (!Number.isSafeInteger(id)) {
    return null;
  }
  return { id, slug: match[2] ?? "" };
}

/**
 * Товар-пустышка (ни описания, ни характеристик) — thin content:
 * generateMetadata отдаёт ему noindex, sitemap не включает. Один предикат
 * на оба места, чтобы критерий не разъехался (noindex-URL в sitemap —
 * ошибка в Search Console).
 */
export function isThinItem(item: { description: string; specs: string }): boolean {
  return item.description.trim() === "" && item.specs.trim() === "";
}

const DESCRIPTION_MAX_LENGTH = 160;

/** Plain-text выжимка из markdown для meta description / JSON-LD. */
export function markdownToPlainText(markdown: string): string {
  return (
    markdown
      // картинки убираем целиком, у ссылок оставляем текст
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // код и заголовки/цитаты/маркеры списков
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      // таблицы: разделители строк и `|` между ячейками
      .replace(/^\|?[\s:|-]+\|[\s:|-]+\|?$/gm, "")
      .replace(/\|/g, " ")
      // эмфазис
      .replace(/(\*\*|__|\*|_|~~)/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Обрезка по границе слова для meta description. */
export function truncateDescription(
  text: string,
  maxLength: number = DESCRIPTION_MAX_LENGTH,
): string {
  if (text.length <= maxLength) {
    return text;
  }
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > maxLength / 2 ? lastSpace : maxLength - 1)}…`;
}

export function metaDescriptionFromMarkdown(markdown: string): string {
  return truncateDescription(markdownToPlainText(markdown));
}
