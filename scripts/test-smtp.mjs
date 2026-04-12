/**
 * Проверка SMTP вне Next.js (те же переменные, что и у /api/contact).
 * Запуск из каталога catalog:
 *   node --env-file=.env ./scripts/test-smtp.mjs
 */
import nodemailer from "nodemailer";

function trimEnv(v) {
  if (v === undefined) return "";
  return String(v)
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

const host = trimEnv(process.env.SMTP_HOST);
const port = Number.parseInt(trimEnv(process.env.SMTP_PORT), 10);
const user = trimEnv(process.env.SMTP_USER);
const pass = trimEnv(process.env.SMTP_PASSWORD);
const to = trimEnv(process.env.CONTACT_MAIL_TO);
const useYandexPreset =
  trimEnv(process.env.SMTP_USE_YANDEX_PRESET) !== "0" &&
  host.toLowerCase() === "smtp.yandex.ru";
const forceIpv4Raw = trimEnv(process.env.SMTP_FORCE_IPV4);
const forceIpv4 = useYandexPreset ? forceIpv4Raw !== "0" : forceIpv4Raw === "1";

if (!host || !user || !pass || !to || !Number.isFinite(port)) {
  console.error("Задайте SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, CONTACT_MAIL_TO в .env");
  process.exit(1);
}

const timeouts = {
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 45_000,
  dnsTimeout: 10_000,
};

const transporter = useYandexPreset
  ? port === 587
    ? nodemailer.createTransport({
        host: "smtp.yandex.ru",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user, pass },
        ...timeouts,
        ...(forceIpv4 ? { family: 4 } : {}),
        tls: { minVersion: "TLSv1.2", servername: "smtp.yandex.ru" },
      })
    : nodemailer.createTransport({
        service: "Yandex",
        auth: { user, pass },
        ...timeouts,
        ...(forceIpv4 ? { family: 4 } : {}),
        tls: { minVersion: "TLSv1.2", servername: "smtp.yandex.ru" },
      })
  : nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user, pass },
      ...timeouts,
      ...(forceIpv4 ? { family: 4 } : {}),
      tls: { minVersion: "TLSv1.2", servername: host },
    });

try {
  console.log("verify()…");
  await transporter.verify();
  console.log("verify OK");
  console.log("sendMail()…");
  await transporter.sendMail({
    from: user,
    to,
    subject: "Тест SMTP (catalog)",
    text: "Если письмо пришло, SMTP настроен верно.",
    envelope: { from: user, to },
  });
  console.log("sendMail OK — проверьте ящик", to);
} catch (e) {
  console.error("Ошибка:", e);
  process.exit(1);
}
