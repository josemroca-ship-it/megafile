-- CreateIndex
CREATE INDEX "Document_operationId_idx" ON "Document"("operationId");

-- CreateIndex
CREATE INDEX "Document_mimeType_idx" ON "Document"("mimeType");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

-- CreateIndex
CREATE INDEX "Operation_createdAt_idx" ON "Operation"("createdAt");

-- CreateIndex
CREATE INDEX "Operation_clientName_idx" ON "Operation"("clientName");

-- CreateIndex
CREATE INDEX "Operation_clientRut_idx" ON "Operation"("clientRut");

-- CreateIndex
CREATE INDEX "Operation_createdById_idx" ON "Operation"("createdById");
