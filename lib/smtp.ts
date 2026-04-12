import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  to: string;
};

/** Убирает невидимые символы из значений, скопированных из мессенджеров / с BOM. */
export function sanitizeEnvValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

export function getSmtpConfigFromEnv(): SmtpConfig | null {
  const host = sanitizeEnvValue(process.env.SMTP_HOST);
  const portRaw = sanitizeEnvValue(process.env.SMTP_PORT);
  const user = sanitizeEnvValue(process.env.SMTP_USER);
  const pass = sanitizeEnvValue(process.env.SMTP_PASSWORD);
  const to = sanitizeEnvValue(process.env.CONTACT_MAIL_TO);

  if (!host || !portRaw || !user || !pass || !to) {
    return null;
  }

  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }

  return { host, port, user, pass, to };
}

function isYandexSmtpHost(cfg: SmtpConfig): boolean {
  if (process.env.SMTP_USE_YANDEX_PRESET?.trim() === "0") {
    return false;
  }
  return cfg.host.toLowerCase() === "smtp.yandex.ru";
}

/**
 * Для smtp.yandex.ru по умолчанию включаем IPv4 (часто лечит ETIMEDOUT при «битом» IPv6).
 * Отключить: SMTP_FORCE_IPV4=0 в .env
 * Для других хостов: только SMTP_FORCE_IPV4=1.
 */
export function shouldForceIpv4(cfg: SmtpConfig): boolean {
  const v = process.env.SMTP_FORCE_IPV4?.trim();
  if (isYandexSmtpHost(cfg)) {
    return v !== "0";
  }
  return v === "1";
}

export function createContactMailTransporter(
  cfg: SmtpConfig,
  opts: { forceIpv4?: boolean; debug?: boolean } = {},
) {
  const { forceIpv4 = shouldForceIpv4(cfg), debug = false } = opts;

  const timeouts = {
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 45_000,
    dnsTimeout: 10_000,
  };

  const tlsBase = {
    minVersion: "TLSv1.2" as const,
    servername: "smtp.yandex.ru",
  };

  const logOpts = debug ? { debug: true as const, logger: console } : {};

  if (isYandexSmtpHost(cfg)) {
    // Пресет "Yandex" в nodemailer жёстко задаёт порт 465. Если провайдер режет 465,
    // задайте SMTP_PORT=587 — используем STARTTLS вручную (тот же smtp.yandex.ru).
    if (cfg.port === 587) {
      return nodemailer.createTransport({
        host: "smtp.yandex.ru",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: cfg.user,
          pass: cfg.pass,
        },
        ...timeouts,
        ...(forceIpv4 ? { family: 4 } : {}),
        tls: tlsBase,
        ...logOpts,
      } as SMTPTransport.Options & { family?: number });
    }

    return nodemailer.createTransport({
      service: "Yandex",
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
      ...timeouts,
      ...(forceIpv4 ? { family: 4 } : {}),
      tls: tlsBase,
      ...logOpts,
    } as SMTPTransport.Options & { family?: number });
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    requireTLS: cfg.port === 587,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    ...timeouts,
    ...(forceIpv4 ? { family: 4 } : {}),
    tls: {
      minVersion: "TLSv1.2",
      servername: cfg.host,
    },
    ...logOpts,
  } as SMTPTransport.Options & { family?: number });
}
