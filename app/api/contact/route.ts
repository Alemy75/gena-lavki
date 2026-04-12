import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  createContactMailTransporter,
  getSmtpConfigFromEnv,
  shouldForceIpv4,
} from "@/lib/smtp";

export const runtime = "nodejs";

const MAX_LEN = {
  name: 200,
  email: 254,
  phone: 50,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Коды errno часто лежат в error.cause (Node 20+). */
function getDeepErrMeta(err: unknown): { code: string; message: string } {
  let code = "";
  let message = "";
  let cur: unknown = err;
  for (let i = 0; i < 8 && cur && typeof cur === "object"; i++) {
    const o = cur as { code?: string; message?: string; cause?: unknown };
    if (typeof o.message === "string" && o.message && !message) {
      message = o.message;
    }
    if (typeof o.code === "string" && o.code) {
      code = o.code;
      break;
    }
    cur = o.cause;
  }
  if (!code && err instanceof Error && "code" in err && typeof (err as NodeJS.ErrnoException).code === "string") {
    code = (err as NodeJS.ErrnoException).code ?? "";
  }
  if (!message && err instanceof Error) {
    message = err.message;
  }
  return { code, message };
}

function smtpFailureMessage(err: unknown, smtpDebug: boolean): string {
  if (err instanceof Error && err.message === "SMTP timeout") {
    return "Превышено время ожидания ответа почтового сервера. Проверьте сеть или настройки SMTP.";
  }

  const e = err as {
    code?: string;
    responseCode?: number;
    response?: string;
    message?: string;
  };

  const { code: deepCode, message: deepMsg } = getDeepErrMeta(err);
  const code = deepCode || (typeof e.code === "string" ? e.code : "");
  const responseCode = typeof e.responseCode === "number" ? e.responseCode : 0;
  const response = typeof e.response === "string" ? e.response : "";
  const firstLine = response.split(/\r?\n/).filter(Boolean)[0] ?? "";

  if (smtpDebug && (firstLine || deepMsg)) {
    return `SMTP: ${firstLine || deepMsg}`;
  }

  if (
    code === "EAUTH" ||
    responseCode === 535 ||
    responseCode === 534 ||
    /authentication failed|invalid login|5\.7\.8/i.test(response)
  ) {
    return "Ошибка входа на SMTP: проверьте SMTP_USER (полный адрес @yandex.ru) и пароль приложения Яндекса, не обычный пароль аккаунта.";
  }

  if (
    responseCode === 550 ||
    responseCode === 551 ||
    responseCode === 552 ||
    responseCode === 553 ||
    responseCode === 554 ||
    /mailbox unavailable|message rejected|spam|policy/i.test(response)
  ) {
    return "Сервер отклонил отправку письма. Попробуйте отключить ответный адрес: в .env задайте CONTACT_OMIT_REPLY_TO=1 и перезапустите приложение. Если не поможет — проверьте лимиты и настройки ящика в Яндексе.";
  }

  const netCodes = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EAI_AGAIN",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "EPIPE",
  ]);
  if (netCodes.has(code)) {
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
      return "Не найден хост SMTP (DNS). Проверьте SMTP_HOST: для Яндекса должно быть smtp.yandex.ru без пробелов; проверьте интернет и DNS.";
    }
    if (code === "ECONNREFUSED") {
      return "Подключение к SMTP отклонено (порт недоступен). Проверьте SMTP_PORT: для Яндекса обычно 465; убедитесь, что файрвол/VPN не блокирует исходящие подключения на 465 или 587.";
    }
    if (code === "ETIMEDOUT") {
      return "Таймаут при подключении к SMTP. Часто режут порт 465: для Яндекса в .env задайте SMTP_PORT=587 и перезапустите приложение. Проверьте VPN/файрвол.";
    }
    return "Сеть не доходит до почтового сервера. Проверьте интернет, VPN, файрвол и значения SMTP_HOST/SMTP_PORT.";
  }

  if (
    code === "CERT_HAS_EXPIRED" ||
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    /certificate|SSL|TLS|UNSAFE/i.test(deepMsg + (e.message ?? ""))
  ) {
    return "Ошибка TLS при соединении с SMTP. Проверьте хост (для Яндекса: smtp.yandex.ru, порт 465).";
  }

  return "Не удалось отправить сообщение. Попробуйте позже.";
}

export async function POST(request: Request) {
  const cfg = getSmtpConfigFromEnv();
  if (!cfg) {
    return NextResponse.json(
      { error: "Отправка писем не настроена на сервере" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const email = typeof o.email === "string" ? o.email.trim() : "";
  const phone = typeof o.phone === "string" ? o.phone.trim() : "";
  const consent = o.consent === true;

  if (!name || name.length > MAX_LEN.name) {
    return NextResponse.json(
      { error: "Укажите, как к вам обращаться (до 200 символов)" },
      { status: 400 },
    );
  }
  if (!email || email.length > MAX_LEN.email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Укажите корректный адрес почты" }, { status: 400 });
  }
  if (!phone || phone.length > MAX_LEN.phone) {
    return NextResponse.json(
      { error: "Укажите телефон (до 50 символов)" },
      { status: 400 },
    );
  }
  if (!consent) {
    return NextResponse.json(
      { error: "Нужно согласие на обработку персональных данных" },
      { status: 400 },
    );
  }

  const forceIpv4 = shouldForceIpv4(cfg);
  const smtpDebug = process.env.CONTACT_SMTP_DEBUG?.trim() === "1";
  const omitReplyTo = process.env.CONTACT_OMIT_REPLY_TO?.trim() === "1";

  const transporter = createContactMailTransporter(cfg, {
    forceIpv4,
    debug: smtpDebug,
  });

  const text = [
    `Обращение: ${name}`,
    `Почта: ${email}`,
    `Телефон: ${phone}`,
    `Согласие на обработку ПДн: да`,
  ].join("\n");

  const SEND_DEADLINE_MS = 50_000;
  try {
    await Promise.race([
      transporter.sendMail({
        from: cfg.user,
        to: cfg.to,
        ...(omitReplyTo ? {} : { replyTo: email }),
        subject: "Заявка с сайта: каталог",
        text,
        envelope: {
          from: cfg.user,
          to: cfg.to,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SMTP timeout")), SEND_DEADLINE_MS),
      ),
    ]);
  } catch (err) {
    console.error("contact mail error", err);
    const saveFallback = process.env.CONTACT_SAVE_IF_MAIL_FAILS?.trim() === "1";
    if (saveFallback) {
      try {
        await prisma.contactMessage.create({
          data: { name, email, phone, consent },
        });
        return NextResponse.json({
          ok: true,
          savedWithoutMail: true,
          message:
            "Почта с этого сервера сейчас не уходит (сеть блокирует SMTP). Заявка сохранена — мы свяжемся с вами по указанным контактам.",
        });
      } catch (dbErr) {
        console.error("contact fallback DB error", dbErr);
      }
    }
    return NextResponse.json(
      { error: smtpFailureMessage(err, smtpDebug) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
