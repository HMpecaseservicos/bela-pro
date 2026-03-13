-- =============================================================================
-- Migration: Patrocinadores Locais (Workspace) + Mensagens Admin
-- Data: 2026-03-13
-- Descrição: 
--   1. Adiciona campos para patrocinadores locais no Workspace
--   2. Adiciona scope e workspaceId no Sponsor para sponsors locais
--   3. Cria modelo AdminMessage para comunicação do Super Admin
-- =============================================================================

-- CreateEnum: SponsorScope
CREATE TYPE "SponsorScope" AS ENUM ('GLOBAL', 'WORKSPACE');

-- CreateEnum: AdminMessageType
CREATE TYPE "AdminMessageType" AS ENUM ('INFO', 'UPDATE', 'MAINTENANCE', 'FEATURE', 'WARNING', 'PROMOTION');

-- AlterTable: Workspace - Adiciona campos de controle de patrocinadores
ALTER TABLE "Workspace" ADD COLUMN "showGlobalSponsors" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Workspace" ADD COLUMN "localSponsorsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Workspace" ADD COLUMN "localSponsorsLimit" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Sponsor - Adiciona scope e workspaceId
ALTER TABLE "Sponsor" ADD COLUMN "scope" "SponsorScope" NOT NULL DEFAULT 'GLOBAL';
ALTER TABLE "Sponsor" ADD COLUMN "workspaceId" TEXT;

-- AddForeignKey: Sponsor -> Workspace
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: Sponsor
CREATE INDEX "Sponsor_scope_idx" ON "Sponsor"("scope");
CREATE INDEX "Sponsor_workspaceId_idx" ON "Sponsor"("workspaceId");
CREATE INDEX "Sponsor_workspaceId_isActive_idx" ON "Sponsor"("workspaceId", "isActive");

-- CreateTable: AdminMessage
CREATE TABLE "AdminMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "AdminMessageType" NOT NULL DEFAULT 'INFO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "icon" TEXT,
    "actionLabel" TEXT,
    "actionUrl" TEXT,
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "targetPlans" TEXT[],
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "AdminMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: AdminMessage
CREATE INDEX "AdminMessage_isActive_idx" ON "AdminMessage"("isActive");
CREATE INDEX "AdminMessage_startsAt_idx" ON "AdminMessage"("startsAt");
CREATE INDEX "AdminMessage_expiresAt_idx" ON "AdminMessage"("expiresAt");

-- CreateTable: AdminMessageDismissal
CREATE TABLE "AdminMessageDismissal" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "AdminMessageDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: AdminMessageDismissal
CREATE INDEX "AdminMessageDismissal_workspaceId_idx" ON "AdminMessageDismissal"("workspaceId");
CREATE UNIQUE INDEX "AdminMessageDismissal_messageId_workspaceId_key" ON "AdminMessageDismissal"("messageId", "workspaceId");

-- AddForeignKey: AdminMessageDismissal -> AdminMessage
ALTER TABLE "AdminMessageDismissal" ADD CONSTRAINT "AdminMessageDismissal_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AdminMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
