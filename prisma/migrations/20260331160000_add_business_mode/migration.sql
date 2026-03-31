-- CreateEnum
CREATE TYPE "BusinessMode" AS ENUM ('BOOKING', 'SHOP', 'HYBRID');

-- AlterTable: add businessMode with default BOOKING
ALTER TABLE "Workspace" ADD COLUMN "businessMode" "BusinessMode" NOT NULL DEFAULT 'BOOKING';

-- Migrate existing data: shopEnabled=true → HYBRID
UPDATE "Workspace" SET "businessMode" = 'HYBRID' WHERE "shopEnabled" = true;
