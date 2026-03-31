-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "highlightTitle" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "highlightSubtitle" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "highlightServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Workspace" ADD COLUMN "aboutText" TEXT;
