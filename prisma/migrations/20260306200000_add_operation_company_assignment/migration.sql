-- Add company assignment directly on operation
ALTER TABLE "Operation"
ADD COLUMN "companyId" TEXT;

CREATE INDEX "Operation_companyId_idx" ON "Operation"("companyId");

ALTER TABLE "Operation"
ADD CONSTRAINT "Operation_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill with creator company when available
UPDATE "Operation" o
SET "companyId" = u."companyId"
FROM "User" u
WHERE o."createdById" = u."id" AND o."companyId" IS NULL;
