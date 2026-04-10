import { prisma } from "@/lib/prisma";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function Home() {
  const items = await prisma.catalogItem.findMany({
    orderBy: { id: "asc" },
  });
  type Item = (typeof items)[number];

  return (
    <div className="p-6">
      <ul className="grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item: Item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 overflow-hidden rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <Image
              src={item.image}
              alt={item.name}
              width={64}
              height={64}
              className="size-16 shrink-0 rounded object-cover"
            />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {item.name}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
