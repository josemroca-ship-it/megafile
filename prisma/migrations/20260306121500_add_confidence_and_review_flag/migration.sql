-- AlterTable
ALTER TABLE "Operation"
  ADD COLUMN "requiresReview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewReason" TEXT;

-- AlterTable
ALTER TABLE "Document"
  ADD COLUMN "confidenceGlobal" DOUBLE PRECISION,
  ADD COLUMN "confidenceByField" JSONB;
