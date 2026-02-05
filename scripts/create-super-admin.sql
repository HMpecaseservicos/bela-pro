-- Script para criar/promover um usuário a Super Admin
-- Execute manualmente no banco de dados

-- OPÇÃO 1: Promover usuário existente por email
-- UPDATE "User" SET "isSuperAdmin" = true WHERE email = 'admin@seudominio.com';

-- OPÇÃO 2: Criar novo super admin (substitua os valores)
-- Primeiro gere o hash da senha usando: npx ts-node -e "import { hash } from '@node-rs/argon2'; hash('suaSenhaForte123').then(console.log)"
-- INSERT INTO "User" (id, "createdAt", "updatedAt", name, email, "passwordHash", "isActive", "isSuperAdmin")
-- VALUES (
--   'clsuperadmin001',
--   NOW(),
--   NOW(),
--   'Super Admin',
--   'superadmin@bela-pro.com',
--   '$HASH_GERADO_AQUI',
--   true,
--   true
-- );

-- Verificar super admins
SELECT id, name, email, "isSuperAdmin", "createdAt" FROM "User" WHERE "isSuperAdmin" = true;
