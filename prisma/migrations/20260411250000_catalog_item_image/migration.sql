-- CreateTable
CREATE TABLE "catalog_item_image" (
    "id" SERIAL NOT NULL,
    "catalogItemId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "catalog_item_image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_item_image_catalogItemId_idx" ON "catalog_item_image"("catalogItemId");

-- AddForeignKey
ALTER TABLE "catalog_item_image" ADD CONSTRAINT "catalog_item_image_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "catalog_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: одна строка на существующую позицию (обложка = прежнее поле image)
INSERT INTO "catalog_item_image" ("catalogItemId", "url", "sortOrder")
SELECT "id", "image", 0 FROM "catalog_item";
