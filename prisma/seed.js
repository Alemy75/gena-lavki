const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const mockItems = [
  { name: "Деревянная лавка парковая", image: "https://picsum.photos/id/237/400/300" },
  { name: "Скамья садовая", image: "https://picsum.photos/id/433/400/300" },
  { name: "Урна металлическая", image: "https://picsum.photos/id/292/400/300" },
  { name: "Контейнер для раздельного сбора", image: "https://picsum.photos/id/1060/400/300" },
  { name: "Вазон уличный", image: "https://picsum.photos/id/306/400/300" },
  { name: "Ограждение декоративное", image: "https://picsum.photos/id/48/400/300" },
];

async function main() {
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
