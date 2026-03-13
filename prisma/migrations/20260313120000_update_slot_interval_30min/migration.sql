-- Atualiza todos os workspaces existentes para usar slotIntervalMinutes = 30
-- Padrão profissional da indústria de beleza (slots de 30 em 30 minutos)
UPDATE "Workspace" 
SET "slotIntervalMinutes" = 30 
WHERE "slotIntervalMinutes" = 15;
