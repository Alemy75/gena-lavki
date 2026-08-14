-- CreateTable
CREATE TABLE "home_content" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "heroTitle" TEXT NOT NULL DEFAULT '',
    "heroText" TEXT NOT NULL DEFAULT '',
    "deliveryTitle" TEXT NOT NULL DEFAULT '',
    "deliveryText" TEXT NOT NULL DEFAULT '',
    "deliveryFeatures" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "home_content_pkey" PRIMARY KEY ("id")
);
