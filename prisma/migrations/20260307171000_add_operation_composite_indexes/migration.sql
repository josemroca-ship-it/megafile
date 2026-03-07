-- CreateIndex
CREATE INDEX "Operation_companyId_createdAt_idx" ON "Operation"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Operation_status_createdAt_idx" ON "Operation"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Operation_companyId_status_createdAt_idx" ON "Operation"("companyId", "status", "createdAt");
