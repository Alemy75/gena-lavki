import Script from "next/script";

/**
 * Яндекс.Метрика. Включается переменной окружения YANDEX_METRIKA_ID
 * (номер счётчика) — без неё не рендерит ничего. Помимо аналитики счётчик
 * нужен Вебмастеру для «обхода по счётчикам Метрики»: товары создаются в
 * рантайме из админки, и это помогает Яндексу находить их быстрее.
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
ym(${id}, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true});`}
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
