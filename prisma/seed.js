const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Идемпотентный сид: только админ, дефолтные настройки сайта и одна реальная
// позиция «Скамья СД». Ничего не удаляет — повторный запуск безопасен.

const SD_CATEGORY = "Скамейки с натуральным деревом";
const SD_NAME = "Скамья СД";
const SD_IMAGE = "/hero-bench.png"; // заглушка; замените фото через админку («+ фото»)
const SD_DESCRIPTION = `**Скамья садовая разборная.** Надёжная и прочная модель из профильной стальной трубы с деревянным настилом. Доступна в двух модификациях — характеристики ниже.`;

const SD_SPECS = `## Модификация БМ-01.2

| Характеристика | Значение |
| --- | --- |
| Артикул | БМ-01.2 |
| Цвет | Серый |
| Поставляется | В разобранном виде |
| Материал сиденья | Дерево |
| Материал каркаса | Профильная труба 25×25×1,5 |
| Наличие вешалки | Без вешалки |
| Вес | 14 кг |
| Объём | 0,2 м³ |
| Высота | 440 мм |
| Ширина | 1500 мм |
| Глубина | 410 мм |
| Назначение | Для больниц |
| НДС | Не включается в цену |

## Модификация 600 (код 64869)

| Характеристика | Значение |
| --- | --- |
| Артикул | 600 |
| Код | 64869 |
| Цвет | Каркас — RAL 7035 (светло-серый); сиденье — брус сосны |
| Поставляется | В разобранном виде |
| Материал сиденья | Шлифованная сосна 20 × 90 мм, покрыта защитным составом |
| Материал каркаса | Профильная труба 25×25 мм |
| Наличие вешалки | Без вешалки |
| Упаковка | Картон |
| Максимальная нагрузка | 100 кг |
| Вес | 4 кг |
| Объём | 0,025 м³ |
| Высота | 440 мм |
| Ширина | 600 мм |
| Глубина | 325 мм |
| Назначение | Гардеробные, для посетителей, рабочих, спортзала; универсальные |
| Гарантийный срок | 1 год |
| Тип покрытия | Каркас — порошковая краска; брус сосны — антисептик и 2 слоя лака |`;

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hash },
    create: { email: adminEmail, passwordHash: hash },
  });
  console.log(`Admin: ${adminEmail} (пароль из ADMIN_PASSWORD или по умолчанию admin123)`);

  // Настройки сайта — только если ещё не заданы (не затираем реальные данные).
  const demoPhone = "+7 (900) 000-00-00";
  const demoAddress = "г. Москва, ул. Примерная, д. 1";
  const settingsRow = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!settingsRow) {
    await prisma.siteSettings.create({
      data: { id: 1, phone: demoPhone, address: demoAddress },
    });
  } else if (!settingsRow.phone.trim() && !settingsRow.address.trim()) {
    await prisma.siteSettings.update({
      where: { id: 1 },
      data: { phone: demoPhone, address: demoAddress },
    });
  }

  // Тексты баннеров главной — только если строки ещё нет (не затираем правки из админки).
  const homeRow = await prisma.homeContent.findUnique({ where: { id: 1 } });
  if (!homeRow) {
    await prisma.homeContent.create({
      data: {
        id: 1,
        heroTitle: "Лавки и садовая мебель ручной работы",
        heroText:
          "Делаем уличные лавки, скамьи и мебель для сада и дачи. Подберём размер, цвет и форму под ваше место — напишите нам, обсудим заказ.",
        deliveryTitle: "Привезём заказ к вам",
        deliveryText:
          "Отправляем по всей России через транспортные компании. Точную стоимость и сроки рассчитываем индивидуально под каждый заказ.",
        deliveryFeatures: [
          "По всей России — СДЭК, Деловые Линии, ПЭК",
          "Самовывоз со склада в Москве — бесплатно",
          "Сроки и стоимость рассчитаем под ваш заказ",
        ].join("\n"),
      },
    });
    console.log("Seeded home content");
  }

  // WhatsApp-ссылка — только если соцссылок ещё нет.
  const socialCount = await prisma.socialLink.count();
  if (socialCount === 0) {
    await prisma.socialLink.create({
      data: {
        label: "WhatsApp",
        url: "https://wa.me/79000000000",
        icon: "/icons/whatsapp.svg",
        sortOrder: 0,
      },
    });
    console.log("Seeded site settings + WhatsApp link");
  }

  // Категория и позиция «Скамья СД» — идемпотентно.
  const category = await prisma.category.upsert({
    where: { name: SD_CATEGORY },
    update: {},
    create: { name: SD_CATEGORY },
  });

  const existing = await prisma.catalogItem.findFirst({ where: { name: SD_NAME } });
  if (existing) {
    await prisma.catalogItem.update({
      where: { id: existing.id },
      data: { description: SD_DESCRIPTION, specs: SD_SPECS, categoryId: category.id },
    });
    console.log(`Обновлена позиция «${SD_NAME}» (#${existing.id})`);
  } else {
    const item = await prisma.catalogItem.create({
      data: {
        name: SD_NAME,
        description: SD_DESCRIPTION,
        specs: SD_SPECS,
        image: SD_IMAGE,
        categoryId: category.id,
        images: { create: [{ url: SD_IMAGE, sortOrder: 0 }] },
      },
    });
    console.log(`Создана позиция «${SD_NAME}» (#${item.id})`);
  }

  // Информационные страницы (контент редактируется в админке).
  const pages = [
    {
      slug: "delivery",
      title: "Доставка",
      content: `## Условия доставки

Доставляем по всей России — рассчитываем индивидуально под каждый заказ
в зависимости от региона, габаритов и количества позиций.

## Сроки

- **Москва и область:** 1–3 рабочих дня после оплаты.
- **Регионы РФ:** 5–14 рабочих дней транспортной компанией.

## Способы

- Самовывоз со склада в Москве — бесплатно.
- Доставка по Москве — расчёт по тарифу транспортной службы.
- Доставка в регионы — через ТК «СДЭК», «Деловые Линии», «ПЭК».

## Как оформить

Свяжитесь с нами через форму на сайте или по телефону — мы рассчитаем
точную стоимость и сроки под ваш заказ.`,
    },
  ];

  for (const p of pages) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: {}, // не затираем правки из админки
      create: p,
    });
  }
  console.log(`Pages: ${pages.map((p) => p.slug).join(", ")} (upsert)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
