import type { OperationStatus } from "@prisma/client";

export const OPERATION_STATUS_ORDER: OperationStatus[] = [
  "PENDIENTE_OCR",
  "EN_VALIDACION",
  "APROBADA",
  "RECHAZADA"
];

export function operationStatusLabel(status: OperationStatus, lang: "es" | "en") {
  if (lang === "en") {
    if (status === "PENDIENTE_OCR") return "Pending OCR";
    if (status === "EN_VALIDACION") return "In validation";
    if (status === "APROBADA") return "Approved";
    return "Rejected";
  }
  if (status === "PENDIENTE_OCR") return "Pendiente OCR";
  if (status === "EN_VALIDACION") return "En validación";
  if (status === "APROBADA") return "Aprobada";
  return "Rechazada";
}

export function operationStatusClass(status: OperationStatus) {
  if (status === "PENDIENTE_OCR") return "border-amber-300 bg-amber-50 text-amber-800";
  if (status === "EN_VALIDACION") return "border-sky-300 bg-sky-50 text-sky-800";
  if (status === "APROBADA") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  return "border-rose-300 bg-rose-50 text-rose-800";
}

