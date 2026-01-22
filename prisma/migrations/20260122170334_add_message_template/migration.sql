-- CreateEnum
CREATE TYPE "MessageEventType" AS ENUM ('APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_REMINDER_24H', 'APPOINTMENT_REMINDER_2H', 'APPOINTMENT_CANCELLED');

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "eventType" "MessageEventType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT NOT NULL,
    "allowClientReply" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageTemplate_workspaceId_idx" ON "MessageTemplate"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_workspaceId_eventType_key" ON "MessageTemplate"("workspaceId", "eventType");

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
