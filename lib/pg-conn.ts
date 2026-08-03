/** Разбирает DATABASE_URL в параметры подключения + PGPASSWORD (минуя ?schema=…). */
export function pgConn(): {
  host: string;
  port: string;
  user: string;
  db: string;
  env: NodeJS.ProcessEnv;
} {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL не задан");
  }
  const u = new URL(raw);
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: decodeURIComponent(u.username),
    db: u.pathname.replace(/^\//, "") || "catalog",
    env: { ...process.env, PGPASSWORD: decodeURIComponent(u.password) },
  };
}
