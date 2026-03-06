-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('PENDIENTE_OCR', 'EN_VALIDACION', 'APROBADA', 'RECHAZADA');

-- AlterTable
ALTER TABLE "Operation" ADD COLUMN "status" "OperationStatus" NOT NULL DEFAULT 'PENDIENTE_OCR';

-- CreateIndex
CREATE INDEX "Operation_status_idx" ON "Operation"("status");
