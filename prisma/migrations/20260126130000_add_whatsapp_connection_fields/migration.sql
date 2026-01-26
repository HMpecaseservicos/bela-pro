-- Add WhatsApp/Evolution connection fields to Workspace

ALTER TABLE "Workspace" ADD COLUMN     "whatsappEvolutionInstanceName" TEXT;
ALTER TABLE "Workspace" ADD COLUMN     "whatsappLastConnectionState" TEXT;
ALTER TABLE "Workspace" ADD COLUMN     "whatsappLastConnectedAt" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN     "whatsappWebhookUrl" TEXT;

CREATE UNIQUE INDEX "Workspace_whatsappEvolutionInstanceName_key" ON "Workspace"("whatsappEvolutionInstanceName");
