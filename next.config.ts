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
};

export default nextConfig;
