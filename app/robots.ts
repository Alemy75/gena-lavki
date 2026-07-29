import { siteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

// SITE_URL известен только в рантайме (Docker-сборка идёт без прод-env),
// поэтому не даём Next закэшировать ответ на этапе build.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Единое правило для всех ботов, включая ИИ-краулеры (GPTBot,
        // ClaudeBot, PerplexityBot): ответы ассистентов на «где заказать
        // лавку» — канал заявок, блокировать их невыгодно. Осознанный allow.
        userAgent: "*",
        allow: "/",
        // /uploads/* не закрываем — там фото товаров для картиночного поиска.
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
