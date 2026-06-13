// Идемпотентно создаёт позицию «Скамья СД» с описанием в Markdown.
// Данные из таблицы заказчика (Сочинение + Тех. характеристики).
// Запуск: node scripts/seed-sd-bench.mjs  (нужен DATABASE_URL)
// В Docker: docker compose -f docker-compose.prod.yml exec -T app node scripts/seed-sd-bench.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NAME = "Скамья СД";
const CATEGORY = "Скамейки с натуральным деревом";
const IMAGE = "/hero-bench.png"; // заглушка; замените фото через админку («+ фото»)

const DESCRIPTION = `**Надёжная и прочная модель.**

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
  const category = await prisma.category.upsert({
    where: { name: CATEGORY },
    update: {},
    create: { name: CATEGORY },
  });

  const existing = await prisma.catalogItem.findFirst({ where: { name: NAME } });

  if (existing) {
    await prisma.catalogItem.update({
      where: { id: existing.id },
      data: { description: DESCRIPTION, categoryId: category.id },
    });
    console.log(`Обновлена позиция «${NAME}» (#${existing.id})`);
    return;
  }

  const item = await prisma.catalogItem.create({
    data: {
      name: NAME,
      description: DESCRIPTION,
      image: IMAGE,
      categoryId: category.id,
      images: { create: [{ url: IMAGE, sortOrder: 0 }] },
    },
  });
  console.log(`Создана позиция «${NAME}» (#${item.id})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
