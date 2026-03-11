-- AlterTable
ALTER TABLE "SponsorInvite" ADD COLUMN "isUniversal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SponsorInvite" ADD COLUMN "universalTitle" TEXT;
ALTER TABLE "SponsorInvite" ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SponsorInvite" ALTER COLUMN "companyName" SET DEFAULT '';
ALTER TABLE "SponsorInvite" ALTER COLUMN "contactName" SET DEFAULT '';

-- CreateIndex
CREATE INDEX "SponsorInvite_isUniversal_idx" ON "SponsorInvite"("isUniversal");
