-- CreateTable
CREATE TABLE "contact_message" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "consent" BOOLEAN NOT NULL,

    CONSTRAINT "contact_message_pkey" PRIMARY KEY ("id")
);
