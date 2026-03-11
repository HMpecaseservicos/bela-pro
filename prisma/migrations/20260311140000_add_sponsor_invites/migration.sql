-- CreateEnum
CREATE TYPE "SponsorInviteStatus" AS ENUM ('PENDING', 'VIEWED', 'CLICKED_CTA', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "SponsorInvite" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "personalMessage" TEXT,
    "proposedTier" "SponsorTier" NOT NULL DEFAULT 'GOLD',
    "proposedType" "SponsorType" NOT NULL DEFAULT 'BRAND',
    "proposedBenefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "SponsorInviteStatus" NOT NULL DEFAULT 'PENDING',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "ctaClickedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "convertedSponsorId" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "SponsorInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SponsorInvite_token_key" ON "SponsorInvite"("token");
CREATE INDEX "SponsorInvite_status_idx" ON "SponsorInvite"("status");
CREATE INDEX "SponsorInvite_token_idx" ON "SponsorInvite"("token");
CREATE INDEX "SponsorInvite_expiresAt_idx" ON "SponsorInvite"("expiresAt");
