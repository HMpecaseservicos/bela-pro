-- Adiciona campo isActive ao Workspace para controle de status
ALTER TABLE "Workspace" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Criar índice para filtros de status
CREATE INDEX "Workspace_isActive_idx" ON "Workspace"("isActive");
