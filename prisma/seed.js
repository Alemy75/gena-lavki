const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const mockItems = [
  {
    name: "Деревянная лавка парковая",
    description:
      "Массивная лавка из лиственницы с антисептической пропиткой. Подходит для аллей и скверов.",
    image: "https://picsum.photos/id/237/400/300",
  },
  {
    name: "Скамья садовая",
    description: "Металлический каркас, сиденье из термодерева. Устойчива к осадкам.",
    image: "https://picsum.photos/id/433/400/300",
  },
  {
    name: "Урна металлическая",
    description: "Объём 50 л, с пепельницей. Порошковое покрытие RAL по запросу.",
    image: "https://picsum.photos/id/292/400/300",
  },
  {
    name: "Контейнер для раздельного сбора",
    description: "Три секции, крышка с фиксаторами. Вариант для улицы и МФЦ.",
    image: "https://picsum.photos/id/1060/400/300",
  },
  {
    name: "Вазон уличный",
    description: "Бетонный вазон с дренажным отверстием. Диаметр 60 см.",
    image: "https://picsum.photos/id/306/400/300",
  },
  {
    name: "Ограждение декоративное",
    description: "Секции по 2 м, установка на анкеры. Цвет на выбор.",
    image: "https://picsum.photos/id/48/400/300",
  },
  {
    name: "Фонарь столбовой",
    description: "LED-модуль, питание 220 В или автономный солнечный вариант.",
    image: "https://picsum.photos/id/169/400/300",
  },
  {
    name: "Перила пешеходные",
    description: "Нержавеющая сталь, высота 900 мм по ГОСТ.",
    image: "https://picsum.photos/id/28/400/300",
  },
  {
    name: "Крышка люка садовая",
    description: "Композит, нагрузка до 1,5 т. Защита от запахов.",
    image: "https://picsum.photos/id/119/400/300",
  },
  {
    name: "Столик уличный",
    description: "Столешница HPL, основание чугун. Комплект со скамьями.",
    image: "https://picsum.photos/id/180/400/300",
  },
  {
    name: "Клумба бетонная",
    description: "Круглая, высота 40 см. Можно комбинировать в ряд.",
    image: "https://picsum.photos/id/82/400/300",
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
  await prisma.catalogItem.createMany({ data: mockItems });
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
