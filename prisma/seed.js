const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Идемпотентный сид: только админ, дефолтные настройки сайта и одна реальная
// позиция «Скамья СД». Ничего не удаляет — повторный запуск безопасен.

const SD_CATEGORY = "Скамейки с натуральным деревом";
const SD_NAME = "Скамья СД";
const SD_IMAGE = "/hero-bench.png"; // заглушка; замените фото через админку («+ фото»)
const SD_DESCRIPTION = `**Надёжная и прочная модель.**

- Каркас: труба 25×25 мм
- Соединитель 20×20 мм
- Сиденье: брус 30 мм
- Разборная конструкция
- Доступны модели от 800 мм (СД-800) до 2000 мм (СД-2000)

## Технические характеристики

- **Материал каркаса:** профильная стальная труба
- **Сечение трубы:** 25×25×1,5 мм
- **Покраска:** порошковая
- **Материал настила:** натуральное дерево
- **Толщина доски:** 30 мм
- **Тип конструкции:** разборная
- **Комплектация:** сборочные болты и гайки
- **Ширина:** 350 мм`;

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
      data: { description: SD_DESCRIPTION, categoryId: category.id },
    });
    console.log(`Обновлена позиция «${SD_NAME}» (#${existing.id})`);
  } else {
    const item = await prisma.catalogItem.create({
      data: {
        name: SD_NAME,
        description: SD_DESCRIPTION,
        image: SD_IMAGE,
        categoryId: category.id,
        images: { create: [{ url: SD_IMAGE, sortOrder: 0 }] },
      },
    });
    console.log(`Создана позиция «${SD_NAME}» (#${item.id})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
