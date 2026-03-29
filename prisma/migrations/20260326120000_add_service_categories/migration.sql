-- CreateTable: ServiceCategory
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconEmoji" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- AddColumn: Service.categoryId
ALTER TABLE "Service" ADD COLUMN "categoryId" TEXT;

-- CreateIndex: ServiceCategory workspaceId + name unique
CREATE UNIQUE INDEX "ServiceCategory_workspaceId_name_key" ON "ServiceCategory"("workspaceId", "name");

-- CreateIndex: ServiceCategory workspaceId + sortOrder
CREATE INDEX "ServiceCategory_workspaceId_sortOrder_idx" ON "ServiceCategory"("workspaceId", "sortOrder");

-- CreateIndex: Service.categoryId
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- AddForeignKey: ServiceCategory -> Workspace
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Service -> ServiceCategory
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- MigrateData: Create categories from existing categoryTag values
INSERT INTO "ServiceCategory" ("id", "createdAt", "updatedAt", "workspaceId", "name", "sortOrder")
SELECT 
    gen_random_uuid()::text,
    NOW(),
    NOW(),
    s."workspaceId",
    s."categoryTag",
    ROW_NUMBER() OVER (PARTITION BY s."workspaceId" ORDER BY MIN(s."createdAt")) - 1 as sortOrder
FROM "Service" s
WHERE s."categoryTag" IS NOT NULL AND s."categoryTag" != ''
GROUP BY s."workspaceId", s."categoryTag";

-- MigrateData: Update Service.categoryId based on categoryTag
UPDATE "Service" s
SET "categoryId" = sc."id"
FROM "ServiceCategory" sc
WHERE s."workspaceId" = sc."workspaceId" 
  AND s."categoryTag" = sc."name"
  AND s."categoryTag" IS NOT NULL 
  AND s."categoryTag" != '';
