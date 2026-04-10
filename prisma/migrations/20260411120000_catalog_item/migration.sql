-- Drop legacy table from previous schema (if present)
DROP TABLE IF EXISTS "Item";

-- CreateTable
CREATE TABLE "catalog_item" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_item_pkey" PRIMARY KEY ("id")
);
