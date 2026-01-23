-- CreateEnum
CREATE TYPE "WorkspacePlan" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');

-- AlterTable: Add plan and chatbotEnabled to Workspace
ALTER TABLE "Workspace" ADD COLUMN "plan" "WorkspacePlan" NOT NULL DEFAULT 'BASIC';
ALTER TABLE "Workspace" ADD COLUMN "chatbotEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: ChatUsage (controle mensal de conversas)
CREATE TABLE "ChatUsage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "conversationsUsed" INTEGER NOT NULL DEFAULT 0,
    "conversationsLimit" INTEGER NOT NULL,
    "excessConversations" INTEGER NOT NULL DEFAULT 0,
    "lastConversationAt" TIMESTAMP(3),

    CONSTRAINT "ChatUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ConversationBillingEvent (auditoria de billing)
CREATE TABLE "ConversationBillingEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "windowStartAt" TIMESTAMP(3) NOT NULL,
    "windowEndAt" TIMESTAMP(3) NOT NULL,
    "isExcess" BOOLEAN NOT NULL DEFAULT false,
    "yearMonth" TEXT NOT NULL,

    CONSTRAINT "ConversationBillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatUsage_workspaceId_idx" ON "ChatUsage"("workspaceId");

-- CreateIndex
CREATE INDEX "ChatUsage_yearMonth_idx" ON "ChatUsage"("yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "ChatUsage_workspaceId_yearMonth_key" ON "ChatUsage"("workspaceId", "yearMonth");

-- CreateIndex
CREATE INDEX "ConversationBillingEvent_workspaceId_yearMonth_idx" ON "ConversationBillingEvent"("workspaceId", "yearMonth");

-- CreateIndex
CREATE INDEX "ConversationBillingEvent_conversationId_idx" ON "ConversationBillingEvent"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationBillingEvent_windowEndAt_idx" ON "ConversationBillingEvent"("windowEndAt");

-- AddForeignKey
ALTER TABLE "ChatUsage" ADD CONSTRAINT "ChatUsage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
