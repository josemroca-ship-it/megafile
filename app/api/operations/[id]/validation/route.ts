import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ValidationLevel = "OK" | "WARN" | "ERROR";

type ValidationFinding = {
  rule: "amount_consistency" | "identification_consistency" | "merchandise_consistency" | "date_consistency";
  title: string;
  level: ValidationLevel;
  conclusion: string;
  evidence: Array<{ documentId: string; fileName: string; value: string }>;
};

type ValidationSummary = {
  overall: ValidationLevel;
  computedAt: string;
  findings: ValidationFinding[];
};

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s./-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function flatten(input: unknown, prefix = ""): Array<{ key: string; value: string }> {
  if (input === null || input === undefined) return [];
  if (typeof input !== "object") return [{ key: prefix, value: String(input) }];
  if (Array.isArray(input)) return [{ key: prefix, value: JSON.stringify(input) }];

  const out: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flatten(v, key));
    } else {
      out.push({ key, value: String(v ?? "") });
    }
  }
  return out;
}

function parseNumber(raw: string) {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseDate(raw: string) {
  const txt = raw.trim();
  if (!txt) return null;
  const dmy = txt.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const iso = new Date(txt);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function pickOverall(findings: ValidationFinding[]): ValidationLevel {
  if (findings.some((f) => f.level === "ERROR")) return "ERROR";
  if (findings.some((f) => f.level === "WARN")) return "WARN";
  return "OK";
}

async function computeValidation(operationId: string): Promise<ValidationSummary | null> {
  const operation = await prisma.operation.findUnique({
    where: { id: operationId },
    select: {
      id: true,
      clientRut: true,
      documents: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fileName: true,
          extractedFields: true
        }
      }
    }
  });
  if (!operation) return null;

  const docs = operation.documents.map((doc) => ({
    id: doc.id,
    fileName: doc.fileName,
    entries: flatten(doc.extractedFields ?? {})
  }));

  const amountEvidence: Array<{ documentId: string; fileName: string; value: string; amount: number }> = [];
  const idEvidence: Array<{ documentId: string; fileName: string; value: string }> = [];
  const merchEvidence: Array<{ documentId: string; fileName: string; value: string }> = [];
  const dateEvidence: Array<{ documentId: string; fileName: string; value: string; date: Date }> = [];

  for (const doc of docs) {
    for (const entry of doc.entries) {
      const k = normalize(entry.key);
      const v = entry.value.trim();
      if (!v) continue;

      if (/(monto|total|importe|amount|neto|subtotal)/.test(k)) {
        const num = parseNumber(v);
        if (num !== null) amountEvidence.push({ documentId: doc.id, fileName: doc.fileName, value: v, amount: num });
      }
      if (/(rut|identificacion|identification|id_cliente|numero_documento|numero de documento)/.test(k)) {
        idEvidence.push({ documentId: doc.id, fileName: doc.fileName, value: v });
      }
      if (/(mercancia|mercaderia|producto|productos|item|items|descripcion|detalle|articulo)/.test(k)) {
        merchEvidence.push({ documentId: doc.id, fileName: doc.fileName, value: v });
      }
      if (/(fecha|date|emision|emisión|vencimiento|recepcion|recepción)/.test(k)) {
        const d = parseDate(v);
        if (d) dateEvidence.push({ documentId: doc.id, fileName: doc.fileName, value: v, date: d });
      }
    }
  }

  const findings: ValidationFinding[] = [];

  if (amountEvidence.length >= 2) {
    const values = amountEvidence.map((x) => x.amount);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const ratio = min > 0 ? Math.abs(max - min) / min : Math.abs(max - min);
    findings.push({
      rule: "amount_consistency",
      title: "Consistencia de montos",
      level: ratio <= 0.03 ? "OK" : ratio <= 0.1 ? "WARN" : "ERROR",
      conclusion:
        ratio <= 0.03
          ? "Los montos entre documentos son consistentes."
          : ratio <= 0.1
            ? "Los montos muestran diferencias moderadas entre documentos."
            : "Los montos no coinciden entre documentos.",
      evidence: amountEvidence.slice(0, 6).map((e) => ({ documentId: e.documentId, fileName: e.fileName, value: e.value }))
    });
  } else {
    findings.push({
      rule: "amount_consistency",
      title: "Consistencia de montos",
      level: "WARN",
      conclusion: "No hay suficientes datos de monto para validar consistencia.",
      evidence: []
    });
  }

  const normalizedOpId = normalize(operation.clientRut);
  const normalizedIds = idEvidence.map((e) => normalize(e.value));
  const allSameId = normalizedIds.length > 0 && new Set(normalizedIds).size === 1;
  const containsOperationId = normalizedIds.some((v) => v.includes(normalizedOpId) || normalizedOpId.includes(v));
  findings.push({
    rule: "identification_consistency",
    title: "Consistencia de identificación",
    level: allSameId || containsOperationId ? "OK" : idEvidence.length === 0 ? "WARN" : "ERROR",
    conclusion:
      allSameId || containsOperationId
        ? "La identificación del cliente es consistente en la documentación."
        : idEvidence.length === 0
          ? "No se detectaron identificaciones explícitas para validar."
          : "Se detectaron identificaciones distintas entre documentos.",
    evidence: idEvidence.slice(0, 6)
  });

  if (merchEvidence.length >= 2) {
    const normalizedMerch = merchEvidence.map((e) => normalize(e.value)).filter(Boolean);
    const unique = new Set(normalizedMerch);
    const share = unique.size > 0 ? 1 / unique.size : 0;
    findings.push({
      rule: "merchandise_consistency",
      title: "Consistencia de mercancía",
      level: unique.size === 1 ? "OK" : share >= 0.34 ? "WARN" : "ERROR",
      conclusion:
        unique.size === 1
          ? "La mercancía descrita es consistente entre documentos."
          : share >= 0.34
            ? "La mercancía parece parcialmente consistente; revisar ítems."
            : "La mercancía no coincide entre documentos.",
      evidence: merchEvidence.slice(0, 6)
    });
  } else {
    findings.push({
      rule: "merchandise_consistency",
      title: "Consistencia de mercancía",
      level: "WARN",
      conclusion: "No hay suficiente detalle de mercancía para comparación automática.",
      evidence: merchEvidence.slice(0, 6)
    });
  }

  if (dateEvidence.length >= 2) {
    const dayKeys = dateEvidence.map((e) => `${e.date.getFullYear()}-${e.date.getMonth() + 1}-${e.date.getDate()}`);
    const uniqueDays = new Set(dayKeys).size;
    findings.push({
      rule: "date_consistency",
      title: "Consistencia de fechas",
      level: uniqueDays === 1 ? "OK" : uniqueDays <= 3 ? "WARN" : "ERROR",
      conclusion:
        uniqueDays === 1
          ? "Las fechas relevantes son consistentes."
          : uniqueDays <= 3
            ? "Se detectan variaciones de fecha acotadas; revisar contexto."
            : "Las fechas presentan inconsistencias relevantes entre documentos.",
      evidence: dateEvidence.slice(0, 6).map((e) => ({ documentId: e.documentId, fileName: e.fileName, value: e.value }))
    });
  } else {
    findings.push({
      rule: "date_consistency",
      title: "Consistencia de fechas",
      level: "WARN",
      conclusion: "No hay suficientes fechas para validar consistencia.",
      evidence: []
    });
  }

  return {
    overall: pickOverall(findings),
    computedAt: new Date().toISOString(),
    findings
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const operation = await prisma.operation.findUnique({
    where: { id },
    select: { id: true, validationSummary: true, validatedAt: true }
  });
  if (!operation) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

  return NextResponse.json({
    validationSummary: operation.validationSummary,
    validatedAt: operation.validatedAt?.toISOString() ?? null
  });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ANALISTA") {
    return NextResponse.json({ error: "Solo ANALISTA puede ejecutar validación" }, { status: 403 });
  }

  const { id } = await params;
  const summary = await computeValidation(id);
  if (!summary) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

  const updated = await prisma.operation.update({
    where: { id },
    data: {
      validationSummary: summary as Prisma.InputJsonValue,
      validatedAt: new Date()
    },
    select: { validationSummary: true, validatedAt: true }
  });

  return NextResponse.json({
    validationSummary: updated.validationSummary,
    validatedAt: updated.validatedAt?.toISOString() ?? null
  });
}

