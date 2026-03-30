-- LOJA UNIFICADA: Migration para agendamento + loja integrados
-- Adiciona tipos de item (SERVICE/PRODUCT), controle de estoque, pedidos (Order/OrderItem)

-- 1. Criar enums
CREATE TYPE "ServiceItemType" AS ENUM ('SERVICE', 'PRODUCT');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PENDING_PAYMENT', 'CONFIRMED', 'READY', 'DELIVERED', 'CANCELLED');

-- 2. Workspace: toggle da loja
ALTER TABLE "Workspace" ADD COLUMN "shopEnabled" BOOLEAN NOT NULL DEFAULT false;

-- 3. Service: campos de produto
ALTER TABLE "Service" ADD COLUMN "itemType" "ServiceItemType" NOT NULL DEFAULT 'SERVICE';
ALTER TABLE "Service" ADD COLUMN "stock" INTEGER NOT NULL DEFAULT 9999;
ALTER TABLE "Service" ADD COLUMN "pricePurchase" DECIMAL(10,2);
ALTER TABLE "Service" ADD COLUMN "isPhysical" BOOLEAN NOT NULL DEFAULT false;

-- 4. ServiceCategory: tipo de categoria
ALTER TABLE "ServiceCategory" ADD COLUMN "categoryType" "ServiceItemType" NOT NULL DEFAULT 'SERVICE';

-- 5. Appointment: vínculo com pedido
ALTER TABLE "Appointment" ADD COLUMN "linkedOrderId" TEXT;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_linkedOrderId_key" UNIQUE ("linkedOrderId");

-- 6. Criar tabela Order
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalProductsCents" INTEGER NOT NULL DEFAULT 0,
    "totalServicesCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "bookedVia" TEXT NOT NULL DEFAULT 'public',
    "pixCode" TEXT,
    "pixQrBase64" TEXT,
    "pixTxId" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "notes" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- 7. Criar tabela OrderItem
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- 8. FinancialTransaction: vínculo com pedido
ALTER TABLE "FinancialTransaction" ADD COLUMN "orderId" TEXT;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_orderId_key" UNIQUE ("orderId");

-- 9. Índices
CREATE UNIQUE INDEX "Order_pixTxId_key" ON "Order"("pixTxId");
CREATE INDEX "Order_workspaceId_status_idx" ON "Order"("workspaceId", "status");
CREATE INDEX "Order_workspaceId_createdAt_idx" ON "Order"("workspaceId", "createdAt");
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_serviceId_idx" ON "OrderItem"("serviceId");
CREATE INDEX "Service_workspaceId_itemType_idx" ON "Service"("workspaceId", "itemType");

-- 10. Foreign keys
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_linkedOrderId_fkey" FOREIGN KEY ("linkedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
