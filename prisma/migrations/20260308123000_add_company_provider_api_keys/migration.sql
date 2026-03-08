-- AlterTable
ALTER TABLE "CompanyAiConfig"
  ADD COLUMN "openaiApiKey" TEXT,
  ADD COLUMN "geminiApiKey" TEXT,
  ADD COLUMN "anthropicApiKey" TEXT;
