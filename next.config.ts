import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    // Runtime-загруженные файлы лежат в public/uploads/, но Next.js standalone
    // отдаёт только то, что было в public/ при сборке. Перехватываем /uploads/*
    // до файловой системы и проксируем в route handler, который читает с диска.
    return {
      beforeFiles: [{ source: "/uploads/:file", destination: "/api/files/:file" }],
    };
  },
  async headers() {
    // Страховка к meta-robots и robots.txt: админка и API не для индекса.
    // Заголовок матчится по входящему пути, поэтому картинки /uploads/*
    // (внутренний rewrite на /api/files/*) под правило /api не попадают.
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
