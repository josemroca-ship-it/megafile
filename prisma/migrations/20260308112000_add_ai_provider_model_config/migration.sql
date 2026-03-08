-- AlterTable
ALTER TABLE "CompanyAiConfig"
  ADD COLUMN "extractionProvider" TEXT,
  ADD COLUMN "extractionModel" TEXT,
  ADD COLUMN "searchProvider" TEXT,
  ADD COLUMN "searchModel" TEXT;
