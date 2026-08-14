import { prisma } from "@/lib/prisma";
import { cache } from "react";

/** Тексты баннеров по умолчанию — ровно то, что было захардкожено в компонентах. */
export const HOME_DEFAULTS = {
  heroTitle: "Лавки и садовая мебель ручной работы",
  heroText:
    "Делаем уличные лавки, скамьи и мебель для сада и дачи. Подберём размер, цвет и форму под ваше место — напишите нам, обсудим заказ.",
  deliveryTitle: "Привезём заказ к вам",
  deliveryText:
    "Отправляем по всей России через транспортные компании. Точную стоимость и сроки рассчитываем индивидуально под каждый заказ.",
  deliveryFeatures: [
    "По всей России — СДЭК, Деловые Линии, ПЭК",
    "Самовывоз со склада в Москве — бесплатно",
    "Сроки и стоимость рассчитаем под ваш заказ",
  ].join("\n"),
};

export type HomeContent = {
  heroTitle: string;
  heroText: string;
  deliveryTitle: string;
  deliveryText: string;
  deliveryFeatures: string[];
};

/** Строка = пункт. Пустые строки отбрасываем, иначе в списке появятся пустые галочки. */
export function parseFeatures(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

const getRow = cache(() => prisma.homeContent.findUnique({ where: { id: 1 } }));

/**
 * Тексты баннеров для главной. Заголовки и абзацы при пустом значении
 * подменяются дефолтом: пустой h1 ломает вёрстку и SEO. Пункты доставки —
 * наоборот: пустое поле означает «списка нет», это осознанный выбор владельца.
 * Если строки в БД нет вовсе (свежая база без сида), возвращаются все дефолты.
 */
export async function getHomeContent(): Promise<HomeContent> {
  const row = await getRow();
  if (!row) {
    return {
      heroTitle: HOME_DEFAULTS.heroTitle,
      heroText: HOME_DEFAULTS.heroText,
      deliveryTitle: HOME_DEFAULTS.deliveryTitle,
      deliveryText: HOME_DEFAULTS.deliveryText,
      deliveryFeatures: parseFeatures(HOME_DEFAULTS.deliveryFeatures),
    };
  }
  const pick = (value: string, fallback: string) =>
    value.trim() === "" ? fallback : value;
  return {
    heroTitle: pick(row.heroTitle, HOME_DEFAULTS.heroTitle),
    heroText: pick(row.heroText, HOME_DEFAULTS.heroText),
    deliveryTitle: pick(row.deliveryTitle, HOME_DEFAULTS.deliveryTitle),
    deliveryText: pick(row.deliveryText, HOME_DEFAULTS.deliveryText),
    deliveryFeatures: parseFeatures(row.deliveryFeatures),
  };
}
