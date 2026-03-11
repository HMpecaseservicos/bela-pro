-- CreateEnum
CREATE TYPE "SponsorTier" AS ENUM ('DIAMOND', 'GOLD', 'SILVER', 'BRONZE');

-- CreateEnum
CREATE TYPE "SponsorType" AS ENUM ('BRAND', 'SUPPLIER', 'OFFICIAL_PARTNER', 'EDUCATIONAL_PARTNER', 'TECH_PARTNER', 'CAMPAIGN_PARTNER');

-- CreateEnum
CREATE TYPE "SponsorPlacement" AS ENUM ('INVITE_LANDING', 'PUBLIC_BOOKING', 'DASHBOARD', 'MARKETING_PAGE', 'ALL');

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoLightUrl" TEXT,
    "logoDarkUrl" TEXT,
    "coverImageUrl" TEXT,
    "websiteUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "tier" "SponsorTier" NOT NULL DEFAULT 'SILVER',
    "sponsorType" "SponsorType" NOT NULL DEFAULT 'BRAND',
    "placementScopes" "SponsorPlacement"[] DEFAULT ARRAY['ALL']::"SponsorPlacement"[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "contractStartsAt" TIMESTAMP(3),
    "contractEndsAt" TIMESTAMP(3),
    "trackingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "lastClickedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_slug_key" ON "Sponsor"("slug");

-- CreateIndex
CREATE INDEX "Sponsor_isActive_idx" ON "Sponsor"("isActive");

-- CreateIndex
CREATE INDEX "Sponsor_tier_idx" ON "Sponsor"("tier");

-- CreateIndex
CREATE INDEX "Sponsor_sponsorType_idx" ON "Sponsor"("sponsorType");

-- CreateIndex
CREATE INDEX "Sponsor_isFeatured_idx" ON "Sponsor"("isFeatured");

-- CreateIndex
CREATE INDEX "Sponsor_displayOrder_idx" ON "Sponsor"("displayOrder");
