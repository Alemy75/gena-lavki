/**
 * Проверяет DNS и «сырой» TCP до SMTP без nodemailer.
 * Запуск: node --env-file=.env ./scripts/diagnose-smtp.mjs
 *
 * Если и 465, и 587 дают timeout — исходящий SMTP до хоста с этой машины,
 * скорее всего, режется файрволом/провайдером/VPN (не лечится сменой порта в коде).
 */
import dns from "node:dns/promises";
import net from "node:net";

function trim(v) {
  return v === undefined ? "" : String(v).trim();
}

const host = trim(process.env.SMTP_HOST) || "smtp.yandex.ru";

function tcpConnect({ host: h, port, family }) {
  return new Promise((resolve) => {
    /** @type {import('node:net').Socket | undefined} */
    let socket;
    const t = setTimeout(() => {
      try {
        socket?.destroy();
      } catch {
        /* empty */
      }
      resolve({ ok: false, code: "ETIMEDOUT", detail: "timeout 8s" });
    }, 8000);

    socket = net.connect({ host: h, port, family, timeout: 8000 }, () => {
      clearTimeout(t);
      socket?.destroy();
      resolve({ ok: true });
    });
    socket.on("error", (err) => {
      clearTimeout(t);
      resolve({ ok: false, code: err.code, detail: err.message });
    });
  });
}

console.log("Хост:", host, "\n");

try {
  const v4 = await dns.lookup(host, { family: 4 });
  console.log("DNS A:", v4.address);
} catch (e) {
  console.log("DNS A: ошибка —", e.message);
}

try {
  const v6 = await dns.lookup(host, { family: 6 });
  console.log("DNS AAAA:", v6.address);
} catch {
  console.log("DNS AAAA: (нет или ошибка)");
}

console.log("\nTCP (прямое соединение, 8 с):\n");

for (const port of [465, 587]) {
  const r4 = await tcpConnect({ host, port, family: 4 });
  console.log(`  ${host}:${port} IPv4 →`, r4.ok ? "OK" : `${r4.code ?? "?"} (${r4.detail ?? ""})`);

  try {
    const { address } = await dns.lookup(host, { family: 6 });
    const r6 = await tcpConnect({ host: address, port, family: 6 });
    console.log(`  ${host}:${port} IPv6 →`, r6.ok ? "OK" : `${r6.code ?? "?"} (${r6.detail ?? ""})`);
  } catch {
    console.log(`  ${host}:${port} IPv6 → (пропуск)`);
  }
}

console.log(`
Если оба порта — timeout/refused: на этом подключении SMTP до сервера недоступен.
Что попробовать: другая сеть (раздача с телефона), отключить VPN, проверить Little Snitch / корп. файрвол,
или не полагаться на SMTP с этой машины (отправка с VPS/хостинга или API почты по HTTPS).

В приложении можно включить сохранение заявок в БД при ошибке почты: CONTACT_SAVE_IF_MAIL_FAILS=1
(см. .env.example).
`);
