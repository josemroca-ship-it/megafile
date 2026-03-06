-- Create enums for validation rules
CREATE TYPE "ValidationRuleKey" AS ENUM ('amount_consistency', 'identification_consistency', 'merchandise_consistency', 'date_consistency');
CREATE TYPE "ValidationSeverity" AS ENUM ('WARN', 'ERROR');
CREATE TYPE "ValidationDocumentType" AS ENUM ('ALL', 'FACTURA', 'TRANSPORTE', 'IDENTIDAD', 'SOLICITUD', 'OTRO');

-- CreateTable
CREATE TABLE "ValidationRule" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ruleKey" "ValidationRuleKey" NOT NULL,
  "documentType" "ValidationDocumentType" NOT NULL DEFAULT 'ALL',
  "severity" "ValidationSeverity" NOT NULL DEFAULT 'ERROR',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ValidationRule_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "ValidationRule_companyId_isActive_idx" ON "ValidationRule"("companyId", "isActive");
CREATE INDEX "ValidationRule_companyId_documentType_isActive_idx" ON "ValidationRule"("companyId", "documentType", "isActive");

-- FK
ALTER TABLE "ValidationRule"
ADD CONSTRAINT "ValidationRule_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
