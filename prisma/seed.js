const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const categoryDefs = [
  { name: "Лавки и скамьи", sortOrder: 0 },
  { name: "Урны и контейнеры", sortOrder: 1 },
  { name: "Благоустройство", sortOrder: 2 },
  { name: "Освещение и мелочи", sortOrder: 3 },
];

/** @type {Array<{ name: string; description: string; image: string; categoryIndex: number }>} */
const mockItems = [
  {
    name: "Деревянная лавка парковая",
    description:
      "Массивная лавка из лиственницы с антисептической пропиткой. Подходит для аллей и скверов.",
    image: "https://picsum.photos/id/237/400/300",
    categoryIndex: 0,
  },
  {
    name: "Скамья садовая",
    description: "Металлический каркас, сиденье из термодерева. Устойчива к осадкам.",
    image: "https://picsum.photos/id/433/400/300",
    categoryIndex: 0,
  },
  {
    name: "Урна металлическая",
    description: "Объём 50 л, с пепельницей. Порошковое покрытие RAL по запросу.",
    image: "https://picsum.photos/id/292/400/300",
    categoryIndex: 1,
  },
  {
    name: "Контейнер для раздельного сбора",
    description: "Три секции, крышка с фиксаторами. Вариант для улицы и МФЦ.",
    image: "https://picsum.photos/id/1060/400/300",
    categoryIndex: 1,
  },
  {
    name: "Вазон уличный",
    description: "Бетонный вазон с дренажным отверстием. Диаметр 60 см.",
    image: "https://picsum.photos/id/306/400/300",
    categoryIndex: 2,
  },
  {
    name: "Ограждение декоративное",
    description: "Секции по 2 м, установка на анкеры. Цвет на выбор.",
    image: "https://picsum.photos/id/48/400/300",
    categoryIndex: 2,
  },
  {
    name: "Фонарь столбовой",
    description: "LED-модуль, питание 220 В или автономный солнечный вариант.",
    image: "https://picsum.photos/id/169/400/300",
    categoryIndex: 3,
  },
  {
    name: "Перила пешеходные",
    description: "Нержавеющая сталь, высота 900 мм по ГОСТ.",
    image: "https://picsum.photos/id/28/400/300",
    categoryIndex: 2,
  },
  {
    name: "Крышка люка садовая",
    description: "Композит, нагрузка до 1,5 т. Защита от запахов.",
    image: "https://picsum.photos/id/119/400/300",
    categoryIndex: 2,
  },
  {
    name: "Столик уличный",
    description: "Столешница HPL, основание чугун. Комплект со скамьями.",
    image: "https://picsum.photos/id/180/400/300",
    categoryIndex: 0,
  },
  {
    name: "Клумба бетонная",
    description: "Круглая, высота 40 см. Можно комбинировать в ряд.",
    image: "https://picsum.photos/id/82/400/300",
    categoryIndex: 2,
  },
];

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

  await prisma.catalogItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.socialLink.deleteMany();

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

  await prisma.socialLink.create({
    data: {
      label: "WhatsApp",
      url: "https://wa.me/79000000000",
      icon: "/icons/whatsapp.svg",
      sortOrder: 0,
    },
  });
  console.log("Seeded site settings + WhatsApp link");

  for (const c of categoryDefs) {
    await prisma.category.create({ data: c });
  }
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  console.log(`Seeded ${categories.length} categories`);

  const rows = mockItems.map((item) => {
    const cat = categories[item.categoryIndex];
    return {
      name: item.name,
      description: item.description,
      image: item.image,
      categoryId: cat ? cat.id : null,
    };
  });

  await prisma.catalogItem.createMany({ data: rows });
}

main()
  .then(() => {
    console.log(`Seeded ${mockItems.length} catalog items`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
