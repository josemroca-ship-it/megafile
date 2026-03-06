-- AlterTable
ALTER TABLE "Operation"
  ADD COLUMN "validationSummary" JSONB,
  ADD COLUMN "validatedAt" TIMESTAMP(3);
