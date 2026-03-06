import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ValidationLevel = "OK" | "WARN" | "ERROR";
type ValidationVerdict = "MATCH" | "MISMATCH" | "NOT_VERIFIABLE";

type ValidationFinding = {
  rule: "amount_consistency" | "identification_consistency" | "merchandise_consistency" | "date_consistency";
  title: string;
  level: ValidationLevel;
  verdict: ValidationVerdict;
  pair: string;
  conclusion: string;
  evidence: Array<{ documentId: string; fileName: string; value: string }>;
};

type ValidationSummary = {
  overall: ValidationLevel;
  computedAt: string;
  findings: ValidationFinding[];
};

type CanonicalDoc = {
  id: string;
  fileName: string;
  docType: "factura" | "transporte" | "identidad" | "solicitud" | "otro";
  amounts: Array<{ key: string; value: string; amount: number }>;
  ids: Array<{ key: string; value: string }>;
  dates: Array<{ key: string; value: string; date: Date }>;
  items: Array<{ key: string; value: string; normalized: string }>;
};

const AMOUNT_TOLERANCE_PCT = 0.05;
const DATE_TOLERANCE_DAYS = 7;

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

function normalizeId(raw: string) {
  return raw.replace(/[^0-9kK]/g, "").toUpperCase();
}

function classifyDocType(fileName: string, fields: unknown) {
  const source = `${fileName} ${JSON.stringify(fields ?? {})}`;
  const n = normalize(source);
  if (/(factura|invoice)/.test(n)) return "factura" as const;
  if (/(transporte|guia|guia de despacho|recepcion|recepcion de mercaderia|entrega)/.test(n)) return "transporte" as const;
  if (/(cedula|dni|identidad|passport|pasaporte)/.test(n)) return "identidad" as const;
  if (/(solicitud|request|formulario)/.test(n)) return "solicitud" as const;
  return "otro" as const;
}

function canonicalizeDoc(doc: { id: string; fileName: string; extractedFields: unknown }): CanonicalDoc {
  const entries = flatten(doc.extractedFields ?? {});
  const amounts: CanonicalDoc["amounts"] = [];
  const ids: CanonicalDoc["ids"] = [];
  const dates: CanonicalDoc["dates"] = [];
  const items: CanonicalDoc["items"] = [];

  for (const entry of entries) {
    const key = normalize(entry.key);
    const value = entry.value.trim();
    if (!value) continue;

    if (/(monto|total|importe|amount|neto|subtotal)/.test(key)) {
      const amount = parseNumber(value);
      if (amount !== null) amounts.push({ key: entry.key, value, amount });
    }

    if (/(rut|identificacion|identification|id_cliente|numero_documento|numero de documento)/.test(key)) {
      ids.push({ key: entry.key, value });
    }

    if (/(fecha|date|emision|emision|vencimiento|recepcion|recepcion)/.test(key)) {
      const date = parseDate(value);
      if (date) dates.push({ key: entry.key, value, date });
    }

    if (/(mercancia|mercaderia|producto|productos|item|items|descripcion|detalle|articulo|sku|codigo)/.test(key)) {
      const normalized = normalize(value);
      if (normalized.length >= 3) items.push({ key: entry.key, value, normalized });
    }
  }

  return {
    id: doc.id,
    fileName: doc.fileName,
    docType: classifyDocType(doc.fileName, doc.extractedFields),
    amounts,
    ids,
    dates,
    items
  };
}

function evidenceFromAmount(doc: CanonicalDoc, max = 2) {
  return doc.amounts.slice(0, max).map((e) => ({ documentId: doc.id, fileName: doc.fileName, value: e.value }));
}
function evidenceFromIds(doc: CanonicalDoc, max = 2) {
  return doc.ids.slice(0, max).map((e) => ({ documentId: doc.id, fileName: doc.fileName, value: e.value }));
}
function evidenceFromDates(doc: CanonicalDoc, max = 2) {
  return doc.dates.slice(0, max).map((e) => ({ documentId: doc.id, fileName: doc.fileName, value: e.value }));
}
function evidenceFromItems(doc: CanonicalDoc, max = 2) {
  return doc.items.slice(0, max).map((e) => ({ documentId: doc.id, fileName: doc.fileName, value: e.value }));
}

function pickOverall(findings: ValidationFinding[]): ValidationLevel {
  if (findings.some((f) => f.level === "ERROR")) return "ERROR";
  if (findings.some((f) => f.level === "WARN")) return "WARN";
  return "OK";
}

function compareAmount(docA: CanonicalDoc, docB: CanonicalDoc): ValidationFinding {
  const pair = `${docA.fileName} vs ${docB.fileName}`;
  if (docA.amounts.length === 0 || docB.amounts.length === 0) {
    return {
      rule: "amount_consistency",
      title: "Consistencia de montos",
      level: "WARN",
      verdict: "NOT_VERIFIABLE",
      pair,
      conclusion: "No verificable: falta monto en uno o ambos documentos.",
      evidence: [...evidenceFromAmount(docA), ...evidenceFromAmount(docB)]
    };
  }

  const base = docA.amounts[0].amount;
  const comp = docB.amounts[0].amount;
  const ratio = base > 0 ? Math.abs(comp - base) / base : Math.abs(comp - base);
  const ok = ratio <= AMOUNT_TOLERANCE_PCT;

  return {
    rule: "amount_consistency",
    title: "Consistencia de montos",
    level: ok ? "OK" : "ERROR",
    verdict: ok ? "MATCH" : "MISMATCH",
    pair,
    conclusion: ok
      ? `Match: diferencia dentro de tolerancia (${Math.round(AMOUNT_TOLERANCE_PCT * 100)}%).`
      : `Mismatch: diferencia supera tolerancia (${Math.round(AMOUNT_TOLERANCE_PCT * 100)}%).`,
    evidence: [...evidenceFromAmount(docA), ...evidenceFromAmount(docB)]
  };
}

function compareIdentification(docA: CanonicalDoc, docB: CanonicalDoc, operationRut: string): ValidationFinding {
  const pair = `${docA.fileName} vs ${docB.fileName}`;
  const ids = [...docA.ids.map((x) => normalizeId(x.value)), ...docB.ids.map((x) => normalizeId(x.value))].filter(Boolean);
  const opId = normalizeId(operationRut);
  if (ids.length === 0) {
    return {
      rule: "identification_consistency",
      title: "Consistencia de identificación",
      level: "WARN",
      verdict: "NOT_VERIFIABLE",
      pair,
      conclusion: "No verificable: no se encontró identificación en documentos comparados.",
      evidence: [...evidenceFromIds(docA), ...evidenceFromIds(docB)]
    };
  }

  const unique = new Set(ids);
  const matchesOperation = ids.some((x) => x === opId || x.includes(opId) || opId.includes(x));
  const ok = unique.size === 1 || matchesOperation;

  return {
    rule: "identification_consistency",
    title: "Consistencia de identificación",
    level: ok ? "OK" : "ERROR",
    verdict: ok ? "MATCH" : "MISMATCH",
    pair,
    conclusion: ok
      ? "Match: identificación consistente entre documentos/operación."
      : "Mismatch: identificaciones diferentes entre documentos.",
    evidence: [...evidenceFromIds(docA), ...evidenceFromIds(docB)]
  };
}

function compareMerchandise(docA: CanonicalDoc, docB: CanonicalDoc): ValidationFinding {
  const pair = `${docA.fileName} vs ${docB.fileName}`;
  const setA = new Set(docA.items.map((x) => x.normalized));
  const setB = new Set(docB.items.map((x) => x.normalized));
  if (setA.size === 0 || setB.size === 0) {
    return {
      rule: "merchandise_consistency",
      title: "Consistencia de mercancía",
      level: "WARN",
      verdict: "NOT_VERIFIABLE",
      pair,
      conclusion: "No verificable: faltan ítems/mercancía estructurada en uno o ambos documentos.",
      evidence: [...evidenceFromItems(docA), ...evidenceFromItems(docB)]
    };
  }

  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  const jaccard = union > 0 ? intersection / union : 0;
  const ok = jaccard >= 0.5;

  return {
    rule: "merchandise_consistency",
    title: "Consistencia de mercancía",
    level: ok ? "OK" : "ERROR",
    verdict: ok ? "MATCH" : "MISMATCH",
    pair,
    conclusion: ok
      ? "Match: mercancía consistente según intersección de ítems."
      : "Mismatch: baja coincidencia de ítems entre documentos.",
    evidence: [...evidenceFromItems(docA), ...evidenceFromItems(docB)]
  };
}

function compareDate(docA: CanonicalDoc, docB: CanonicalDoc): ValidationFinding {
  const pair = `${docA.fileName} vs ${docB.fileName}`;
  if (docA.dates.length === 0 || docB.dates.length === 0) {
    return {
      rule: "date_consistency",
      title: "Consistencia de fechas",
      level: "WARN",
      verdict: "NOT_VERIFIABLE",
      pair,
      conclusion: "No verificable: faltan fechas en uno o ambos documentos.",
      evidence: [...evidenceFromDates(docA), ...evidenceFromDates(docB)]
    };
  }

  const a = docA.dates[0].date.getTime();
  const b = docB.dates[0].date.getTime();
  const days = Math.abs(a - b) / (1000 * 60 * 60 * 24);
  const ok = days <= DATE_TOLERANCE_DAYS;

  return {
    rule: "date_consistency",
    title: "Consistencia de fechas",
    level: ok ? "OK" : "WARN",
    verdict: ok ? "MATCH" : "MISMATCH",
    pair,
    conclusion: ok
      ? `Match: fechas dentro de tolerancia (${DATE_TOLERANCE_DAYS} días).`
      : `Mismatch: diferencia de fechas fuera de tolerancia (${DATE_TOLERANCE_DAYS} días).`,
    evidence: [...evidenceFromDates(docA), ...evidenceFromDates(docB)]
  };
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

  const docs = operation.documents.map(canonicalizeDoc);
  const invoices = docs.filter((d) => d.docType === "factura");
  const transportDocs = docs.filter((d) => d.docType === "transporte");
  const idDocs = docs.filter((d) => d.docType === "identidad");

  const findings: ValidationFinding[] = [];

  if (invoices[0] && transportDocs[0]) {
    const a = invoices[0];
    const b = transportDocs[0];
    findings.push(compareAmount(a, b));
    findings.push(compareMerchandise(a, b));
    findings.push(compareDate(a, b));
    findings.push(compareIdentification(a, b, operation.clientRut));
  } else if (invoices[0] && idDocs[0]) {
    const a = invoices[0];
    const b = idDocs[0];
    findings.push(compareIdentification(a, b, operation.clientRut));
    findings.push(compareAmount(a, b));
    findings.push(compareDate(a, b));
    findings.push(compareMerchandise(a, b));
  } else {
    const docA = docs[0];
    const docB = docs[1];
    if (!docA || !docB) {
      findings.push({
        rule: "identification_consistency",
        title: "Consistencia documental",
        level: "WARN",
        verdict: "NOT_VERIFIABLE",
        pair: "N/A",
        conclusion: "No verificable: se requieren al menos dos documentos para comparar.",
        evidence: []
      });
    } else {
      findings.push(compareIdentification(docA, docB, operation.clientRut));
      findings.push(compareAmount(docA, docB));
      findings.push(compareDate(docA, docB));
      findings.push(compareMerchandise(docA, docB));
    }
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
