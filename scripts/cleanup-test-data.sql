-- Script para limpar dados de teste criados durante auditoria de segurança
-- Execute com: docker exec -i agenda-postgres-1 psql -U bela -d bela_pro < scripts/cleanup-test-data.sql

BEGIN;

-- 1. Limpar AppointmentService de workspaces de teste
DELETE FROM "AppointmentService" 
WHERE "appointmentId" IN (
  SELECT id FROM "Appointment" 
  WHERE "workspaceId" IN (
    SELECT id FROM "Workspace" WHERE slug LIKE 'tenant-%'
  )
);

-- 2. Limpar Appointments de workspaces de teste
DELETE FROM "Appointment" 
WHERE "workspaceId" IN (
  SELECT id FROM "Workspace" WHERE slug LIKE 'tenant-%'
);

-- 3. Limpar Clients de workspaces de teste
DELETE FROM "Client" 
WHERE "workspaceId" IN (
  SELECT id FROM "Workspace" WHERE slug LIKE 'tenant-%'
);

-- 4. Limpar Services de workspaces de teste
DELETE FROM "Service" 
WHERE "workspaceId" IN (
  SELECT id FROM "Workspace" WHERE slug LIKE 'tenant-%'
);

-- 5. Limpar ScheduleRule de workspaces de teste
DELETE FROM "ScheduleRule" 
WHERE "workspaceId" IN (
  SELECT id FROM "Workspace" WHERE slug LIKE 'tenant-%'
);

-- 6. Limpar TimeOff de workspaces de teste
DELETE FROM "TimeOff" 
WHERE "workspaceId" IN (
  SELECT id FROM "Workspace" WHERE slug LIKE 'tenant-%'
);

-- 7. Limpar InviteToken de workspaces de teste
DELETE FROM "InviteToken" 
WHERE "workspaceId" IN (
  SELECT id FROM "Workspace" WHERE slug LIKE 'tenant-%'
);

-- 8. Limpar Membership de workspaces de teste
DELETE FROM "Membership" 
WHERE "workspaceId" IN (
  SELECT id FROM "Workspace" WHERE slug LIKE 'tenant-%'
);

-- 9. Limpar ProfessionalProfile de workspaces de teste
DELETE FROM "ProfessionalProfile" 
WHERE "workspaceId" IN (
  SELECT id FROM "Workspace" WHERE slug LIKE 'tenant-%'
);

-- 10. Limpar Workspaces de teste
DELETE FROM "Workspace" WHERE slug LIKE 'tenant-%';

-- 11. Limpar Users de teste (sem membership restante)
DELETE FROM "User" WHERE email LIKE '%@test.com';

COMMIT;

-- Mostrar usuários restantes
SELECT email, name FROM "User" ORDER BY email;
