-- CreateEnum
CREATE TYPE "InviteType" AS ENUM ('PERSONAL', 'PUBLIC');

-- AlterTable
ALTER TABLE "BusinessInvite" ADD COLUMN "inviteType" "InviteType" NOT NULL DEFAULT 'PERSONAL';
ALTER TABLE "BusinessInvite" ADD COLUMN "campaignName" TEXT;
ALTER TABLE "BusinessInvite" ADD COLUMN "slug" TEXT;
ALTER TABLE "BusinessInvite" ADD COLUMN "totalClicks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BusinessInvite" ADD COLUMN "totalRegistrations" INTEGER NOT NULL DEFAULT 0;

-- Make phone and businessName optional (for PUBLIC invites)
ALTER TABLE "BusinessInvite" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "BusinessInvite" ALTER COLUMN "businessName" DROP NOT NULL;
ALTER TABLE "BusinessInvite" ALTER COLUMN "contactName" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BusinessInvite_slug_key" ON "BusinessInvite"("slug");

-- CreateIndex
CREATE INDEX "BusinessInvite_inviteType_idx" ON "BusinessInvite"("inviteType");

-- CreateIndex
CREATE INDEX "BusinessInvite_slug_idx" ON "BusinessInvite"("slug");
