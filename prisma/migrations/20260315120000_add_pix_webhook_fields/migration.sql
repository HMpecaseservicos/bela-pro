-- AlterTable: Adicionar campos para webhook PIX e workspaceId na tabela Payment
ALTER TABLE "Payment" ADD COLUMN "pixTxId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "webhookReceivedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "webhookPayload" TEXT;

-- CreateIndex: Índice único para pixTxId
CREATE UNIQUE INDEX "Payment_pixTxId_key" ON "Payment"("pixTxId");

-- CreateIndex: Índice para workspaceId
CREATE INDEX "Payment_workspaceId_idx" ON "Payment"("workspaceId");

-- Atualizar payments existentes para incluir workspaceId a partir do Appointment
UPDATE "Payment" p
SET "workspaceId" = a."workspaceId"
FROM "Appointment" a
WHERE p."appointmentId" = a."id";

-- AddForeignKey: Relação com Workspace
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workspaceId_fkey" 
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
