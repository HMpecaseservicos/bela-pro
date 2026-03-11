-- AlterTable: add auth fields to Sponsor for Diamond login
ALTER TABLE "Sponsor" ADD COLUMN "email" TEXT;
ALTER TABLE "Sponsor" ADD COLUMN "passwordHash" TEXT;

-- CreateIndex: unique email for sponsor login
CREATE UNIQUE INDEX "Sponsor_email_key" ON "Sponsor"("email");

-- CreateIndex: index on email for faster lookup
CREATE INDEX "Sponsor_email_idx" ON "Sponsor"("email");

-- CreateTable: SponsorPost (Diamond sponsors manage their own content)
CREATE TABLE "SponsorPost" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SponsorPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SponsorPost_sponsorId_idx" ON "SponsorPost"("sponsorId");
CREATE INDEX "SponsorPost_isActive_idx" ON "SponsorPost"("isActive");
CREATE INDEX "SponsorPost_publishedAt_idx" ON "SponsorPost"("publishedAt");

-- AddForeignKey
ALTER TABLE "SponsorPost" ADD CONSTRAINT "SponsorPost_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
