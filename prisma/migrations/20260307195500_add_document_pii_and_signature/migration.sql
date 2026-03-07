-- AlterTable
ALTER TABLE "Document"
  ADD COLUMN "hasPii" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "piiDetections" JSONB,
  ADD COLUMN "hasSignature" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "signatureHints" JSONB;

-- CreateIndex
CREATE INDEX "Document_hasPii_idx" ON "Document"("hasPii");

-- CreateIndex
CREATE INDEX "Document_hasSignature_idx" ON "Document"("hasSignature");
