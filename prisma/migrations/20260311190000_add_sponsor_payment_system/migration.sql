-- CreateEnum
CREATE TYPE "SponsorPaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');

-- AlterEnum: Add PENDING_PAYMENT to SponsorContractStatus
ALTER TYPE "SponsorContractStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';

-- Migrate existing DRAFT records to PENDING_PAYMENT
UPDATE "SponsorContract" SET "status" = 'PENDING_PAYMENT' WHERE "status" = 'DRAFT';

-- CreateTable
CREATE TABLE "SponsorPayment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contractId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "status" "SponsorPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "pixCode" TEXT,
    "pixExpiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidByName" TEXT,
    "paymentMethod" TEXT,
    "transactionId" TEXT,
    "confirmedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "SponsorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SponsorPayment_contractId_key" ON "SponsorPayment"("contractId");

-- CreateIndex
CREATE INDEX "SponsorPayment_status_idx" ON "SponsorPayment"("status");

-- CreateIndex
CREATE INDEX "SponsorPayment_tier_idx" ON "SponsorPayment"("tier");

-- AddForeignKey
ALTER TABLE "SponsorPayment" ADD CONSTRAINT "SponsorPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "SponsorContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
