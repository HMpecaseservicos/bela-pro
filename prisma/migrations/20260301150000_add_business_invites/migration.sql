-- CreateEnum
CREATE TYPE "BusinessInviteStatus" AS ENUM ('PENDING', 'VIEWED', 'CLICKED_CTA', 'REGISTERED', 'ACTIVATED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InviteFocusType" AS ENUM ('YOUTH_BEAUTY', 'INCOME_GROWTH', 'RECOGNITION');

-- CreateTable
CREATE TABLE "BusinessInvite" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "token" TEXT NOT NULL,
    "focusType" "InviteFocusType" NOT NULL DEFAULT 'RECOGNITION',
    "personalMessage" TEXT,
    "status" "BusinessInviteStatus" NOT NULL DEFAULT 'PENDING',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "ctaClickedAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "convertedWorkspaceId" TEXT,
    "sentById" TEXT NOT NULL,
    "sentViaWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "sentViaEmail" BOOLEAN NOT NULL DEFAULT false,
    "whatsappSentAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "BusinessInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessInvite_token_key" ON "BusinessInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessInvite_convertedWorkspaceId_key" ON "BusinessInvite"("convertedWorkspaceId");

-- CreateIndex
CREATE INDEX "BusinessInvite_status_idx" ON "BusinessInvite"("status");

-- CreateIndex
CREATE INDEX "BusinessInvite_phone_idx" ON "BusinessInvite"("phone");

-- CreateIndex
CREATE INDEX "BusinessInvite_email_idx" ON "BusinessInvite"("email");

-- CreateIndex
CREATE INDEX "BusinessInvite_expiresAt_idx" ON "BusinessInvite"("expiresAt");

-- CreateIndex
CREATE INDEX "BusinessInvite_token_idx" ON "BusinessInvite"("token");

-- AddForeignKey
ALTER TABLE "BusinessInvite" ADD CONSTRAINT "BusinessInvite_convertedWorkspaceId_fkey" FOREIGN KEY ("convertedWorkspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvite" ADD CONSTRAINT "BusinessInvite_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
