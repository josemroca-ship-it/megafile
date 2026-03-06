-- Comparator enum for field-level matching
CREATE TYPE "ValidationComparator" AS ENUM ('EXACT', 'NORMALIZED_TEXT', 'NUMERIC');

-- Rules for field-to-field consistency by company and document type
CREATE TABLE "ValidationFieldRule" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceDocumentType" "ValidationDocumentType" NOT NULL DEFAULT 'ALL',
  "targetDocumentType" "ValidationDocumentType" NOT NULL DEFAULT 'ALL',
  "sourceFieldPath" TEXT NOT NULL,
  "targetFieldPath" TEXT NOT NULL,
  "comparator" "ValidationComparator" NOT NULL DEFAULT 'NORMALIZED_TEXT',
  "severity" "ValidationSeverity" NOT NULL DEFAULT 'ERROR',
  "tolerancePct" DOUBLE PRECISION,
  "toleranceAbs" DOUBLE PRECISION,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ValidationFieldRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ValidationFieldRule_companyId_isActive_idx" ON "ValidationFieldRule"("companyId", "isActive");
CREATE INDEX "ValidationFieldRule_companyId_sourceDocumentType_targetDocumentType_isActive_idx" ON "ValidationFieldRule"("companyId", "sourceDocumentType", "targetDocumentType", "isActive");

ALTER TABLE "ValidationFieldRule"
ADD CONSTRAINT "ValidationFieldRule_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
