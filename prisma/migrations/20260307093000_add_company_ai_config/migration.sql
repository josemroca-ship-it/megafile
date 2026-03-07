CREATE TABLE "CompanyAiConfig" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "extractionPrompt" TEXT,
  "searchPrompt" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyAiConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyAiConfig_companyId_key" ON "CompanyAiConfig"("companyId");
CREATE INDEX "CompanyAiConfig_companyId_idx" ON "CompanyAiConfig"("companyId");

ALTER TABLE "CompanyAiConfig"
ADD CONSTRAINT "CompanyAiConfig_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
