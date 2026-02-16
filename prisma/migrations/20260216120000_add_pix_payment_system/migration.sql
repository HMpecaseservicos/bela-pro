-- Sistema de Pagamento PIX Manual
-- Permite configurar cobrança de sinal/total para confirmação de agendamentos

-- Novos enums para pagamento
CREATE TYPE "PaymentType" AS ENUM ('NONE', 'FULL', 'PARTIAL_PERCENT', 'PARTIAL_FIXED');
CREATE TYPE "PixKeyType" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

-- Adicionar PENDING_PAYMENT ao enum AppointmentStatus
ALTER TYPE "AppointmentStatus" ADD VALUE 'PENDING_PAYMENT';

-- Adicionar campos de pagamento ao Workspace
ALTER TABLE "Workspace" ADD COLUMN "requirePayment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Workspace" ADD COLUMN "paymentType" "PaymentType" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Workspace" ADD COLUMN "partialPercent" INTEGER;
ALTER TABLE "Workspace" ADD COLUMN "partialFixedAmount" DECIMAL(10,2);
ALTER TABLE "Workspace" ADD COLUMN "paymentExpiryMinutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Workspace" ADD COLUMN "pixKeyType" "PixKeyType";
ALTER TABLE "Workspace" ADD COLUMN "pixKey" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "pixHolderName" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "pixCity" TEXT;

-- Criar tabela de pagamentos
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "serviceTotalCents" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "pixCode" TEXT,
    "pixQrBase64" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE UNIQUE INDEX "Payment_appointmentId_key" ON "Payment"("appointmentId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_expiresAt_idx" ON "Payment"("expiresAt");

-- Foreign key
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointmentId_fkey" 
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
