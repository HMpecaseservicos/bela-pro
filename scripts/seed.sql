-- Seed: Atualizar workspace com configurações de aparência
UPDATE "Workspace" SET 
  "brandName" = 'Meu Salão',
  "primaryColorHex" = '#8B5CF6',
  "welcomeText" = 'Agende seu horário conosco!',
  "description" = 'Especialistas em cuidados com cabelos e unhas',
  "slotIntervalMinutes" = 30,
  "minLeadTimeMinutes" = 60,
  "bufferMinutes" = 15
WHERE id = 'ws-demo-001';

-- Atualizar serviços com showInBooking
UPDATE "Service" SET "showInBooking" = true, "sortOrder" = 0 WHERE id = 'svc-001';
UPDATE "Service" SET "showInBooking" = true, "sortOrder" = 1 WHERE id = 'svc-002';
UPDATE "Service" SET "showInBooking" = true, "sortOrder" = 2 WHERE id = 'svc-003';
