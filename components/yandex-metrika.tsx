import Script from "next/script";

/**
 * Яндекс.Метрика. Включается переменной окружения YANDEX_METRIKA_ID
 * (номер счётчика) — без неё не рендерит ничего. Помимо аналитики счётчик
 * нужен Вебмастеру для «обхода по счётчикам Метрики»: товары создаются в
 * рантайме из админки, и это помогает Яндексу находить их быстрее.
 *
 * Опции повторяют настройки счётчика в интерфейсе Метрики: ssr — страницы
 * рендерятся на сервере, webvisor — запись сессий. `ecommerce:"dataLayer"`
 * из сниппета Метрики не переносим: на сайте нет ни dataLayer, ни событий
 * электронной торговли, включать приёмник данных, который никто не наполняет,
 * незачем. `referrer` и `url` тоже опущены — счётчик берёт их сам.
 */
export function YandexMetrika() {
  const id = process.env.YANDEX_METRIKA_ID?.trim() ?? "";
  if (!/^\d+$/.test(id)) {
    return null;
  }

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(${id}, "init", {ssr:true, webvisor:true, clickmap:true, trackLinks:true, accurateTrackBounce:true});`}
      </Script>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${id}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
