-- CreateEnum
CREATE TYPE "SponsorContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'RENEWED');

-- CreateTable
CREATE TABLE "SponsorContract" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "sponsorName" TEXT NOT NULL,
    "sponsorEmail" TEXT,
    "sponsorPhone" TEXT,
    "sponsorDocument" TEXT,
    "sponsorAddress" TEXT,
    "contactPersonName" TEXT NOT NULL,
    "tier" "SponsorTier" NOT NULL,
    "sponsorType" "SponsorType" NOT NULL,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "obligations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "monthlyValue" DOUBLE PRECISION,
    "totalValue" DOUBLE PRECISION,
    "paymentTerms" TEXT,
    "status" "SponsorContractStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "signedByName" TEXT,
    "signedByIp" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "renewalNotifiedAt" TIMESTAMP(3),
    "previousContractId" TEXT,
    "notes" TEXT,

    CONSTRAINT "SponsorContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SponsorContract_contractNumber_key" ON "SponsorContract"("contractNumber");
CREATE INDEX "SponsorContract_sponsorId_idx" ON "SponsorContract"("sponsorId");
CREATE INDEX "SponsorContract_status_idx" ON "SponsorContract"("status");
CREATE INDEX "SponsorContract_contractNumber_idx" ON "SponsorContract"("contractNumber");
CREATE INDEX "SponsorContract_endsAt_idx" ON "SponsorContract"("endsAt");

-- AddForeignKey
ALTER TABLE "SponsorContract" ADD CONSTRAINT "SponsorContract_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
