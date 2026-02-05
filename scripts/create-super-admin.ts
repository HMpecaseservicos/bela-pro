#!/usr/bin/env npx ts-node
/**
 * Script para criar um Super Admin via CLI
 * 
 * Uso:
 *   npx ts-node scripts/create-super-admin.ts
 * 
 * Ou com argumentos:
 *   npx ts-node scripts/create-super-admin.ts --email=admin@example.com --name="Super Admin" --password=senha123
 */

import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import * as readline from 'readline';

const prisma = new PrismaClient();

async function prompt(question: string, isPassword = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function parseArgs(): { email?: string; name?: string; password?: string } {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  }
  return args;
}

async function main() {
  console.log('\n🔐 Criar Super Admin - BELA PRO\n');
  console.log('='.repeat(40));

  const args = parseArgs();

  const email = args.email || await prompt('Email: ');
  const name = args.name || await prompt('Nome: ');
  const password = args.password || await prompt('Senha (min 8 caracteres): ');

  if (!email || !name || !password) {
    console.error('\n❌ Todos os campos são obrigatórios.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('\n❌ A senha deve ter no mínimo 8 caracteres.');
    process.exit(1);
  }

  // Verifica se já existe
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  
  if (existing) {
    if (existing.isSuperAdmin) {
      console.log(`\n⚠️  Usuário ${email} já é Super Admin.`);
      process.exit(0);
    }
    
    // Promover usuário existente
    await prisma.user.update({
      where: { id: existing.id },
      data: { isSuperAdmin: true },
    });
    
    console.log(`\n✅ Usuário existente promovido a Super Admin!`);
    console.log(`   Email: ${email}`);
    console.log(`   ID: ${existing.id}`);
  } else {
    // Criar novo super admin
    const passwordHash = await hash(password);
    
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        isSuperAdmin: true,
        isActive: true,
      },
    });
    
    console.log(`\n✅ Super Admin criado com sucesso!`);
    console.log(`   Email: ${email}`);
    console.log(`   Nome: ${name}`);
    console.log(`   ID: ${user.id}`);
  }

  console.log('\n' + '='.repeat(40));
  console.log('🎉 Você pode fazer login em /api/v1/auth/login');
  console.log('   e acessar os endpoints em /api/v1/admin/*\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('\n❌ Erro:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
