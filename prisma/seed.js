const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

/** Unsplash: парковые лавки / уличные столы (лицензия Unsplash). */
function unsplash(photoId) {
  return `https://images.unsplash.com/photo-${photoId}?w=400&h=300&fit=crop&auto=format&q=80`;
}

const categoryDefs = [
  { name: "Лавки", sortOrder: 0 },
  { name: "Столы", sortOrder: 1 },
];

/** @type {Array<{ name: string; description: string; image: string; categoryIndex: number }>} */
const mockItems = [
  {
    name: "Парковая лавка из лиственницы",
    description:
      "Массивная лавка с антисептической пропиткой. Подходит для аллей, скверов и дворовых территорий.",
    image: unsplash("1599710244595-dbd9e4f82f74"),
    categoryIndex: 0,
  },
  {
    name: "Скамья садовая с металлокаркасом",
    description: "Сиденье из термодерева, устойчивость к осадкам и УФ. Установка на анкеры.",
    image: unsplash("1559930906-99235d1818eb"),
    categoryIndex: 0,
  },
  {
    name: "Лавка без спинки «Минимал»",
    description: "Лаконичный силуэт для набережных и пешеходных зон. Порошковое покрытие RAL по запросу.",
    image: unsplash("1584887234551-69b18475aaa7"),
    categoryIndex: 0,
  },
  {
    name: "Двусторонняя скамья",
    description: "Два ряда сидений, разделитель из нержавеющей стали. Для широких аллей и площадей.",
    image: unsplash("1770982699007-0f21db83fc8a"),
    categoryIndex: 0,
  },
  {
    name: "Стол уличный с чугунным основанием",
    description: "Столешница HPL, основание чугун. Комплектуется скамьями в той же серии.",
    image: unsplash("1775972342629-f074b62f1795"),
    categoryIndex: 1,
  },
  {
    name: "Стол для пикника",
    description: "Деревянная столешница, металлические ноги. Разборный вариант для дачи и парков.",
    image: unsplash("1587563497519-be9666f3bb8a"),
    categoryIndex: 1,
  },
  {
    name: "Стол барный уличный",
    description: "Высота 110 см, столешница композит. Стационарная установка, устойчив к ветру.",
    image: unsplash("1770462583619-bdcd10a097a2"),
    categoryIndex: 1,
  },
  {
    name: "Стол-композиция со скамьями",
    description: "Единый комплект: стол и две приставные скамьи. Удобно для детских и спортивных площадок.",
    image: unsplash("1761135175265-6ce8c4e9ea34"),
    categoryIndex: 1,
  },
  {
    name: "Лавка «Классика» с подлокотниками",
    description: "Удобная посадка для зон отдыха у МФЦ и ТЦ. Дерево + металл.",
    image: unsplash("1637455435792-4ada8f17f40b"),
    categoryIndex: 0,
  },
  {
    name: "Стол круглый уличный",
    description: "Диаметр 120 см, опора центральная. Для кафе-террас и общественных пространств.",
    image: unsplash("1768527338896-3765921e992d"),
    categoryIndex: 1,
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

  for (const item of mockItems) {
    const cat = categories[item.categoryIndex];
    await prisma.catalogItem.create({
      data: {
        name: item.name,
        description: item.description,
        image: item.image,
        categoryId: cat ? cat.id : null,
        images: {
          create: [{ url: item.image, sortOrder: 0 }],
        },
      },
    });
  }
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
