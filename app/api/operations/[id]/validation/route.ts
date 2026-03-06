import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { ValidationDocumentType, ValidationRuleKey, ValidationSeverity } from "@prisma/client";
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
  ids: Array<{ key: string; value: string; normalized: string }>;
  dates: Array<{ key: string; value: string; date: Date }>;
  items: Array<{ key: string; value: string; normalized: string }>;
};

type RuleConfig = Prisma.JsonValue;
type RuntimeRule = {
  name: string;
  ruleKey: ValidationRuleKey;
  documentType: ValidationDocumentType;
  severity: ValidationSeverity;
  isActive: boolean;
  config?: RuleConfig;
};

const DEFAULT_AMOUNT_TOLERANCE_PCT = 0.03;
const DEFAULT_AMOUNT_TOLERANCE_ABS = 250;
const DEFAULT_DATE_TOLERANCE_DAYS = 7;
const DEFAULT_MERCHANDISE_MIN_COVERAGE = 0.6;

const STOPWORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "con",
  "por",
  "para",
  "sin",
  "tipo",
  "codigo",
  "descripcion",
  "cantidad",
  "precio",
  "unitario",
  "total",
  "item",
  "producto",
  "productos",
  "mercaderia",
  "mercancia"
]);

const DEFAULT_RULES: RuntimeRule[] = [
  {
    name: "Consistencia de identificación",
    ruleKey: ValidationRuleKey.identification_consistency,
    documentType: ValidationDocumentType.ALL,
    severity: ValidationSeverity.ERROR,
    isActive: true
  },
  {
    name: "Consistencia de montos",
    ruleKey: ValidationRuleKey.amount_consistency,
    documentType: ValidationDocumentType.ALL,
    severity: ValidationSeverity.ERROR,
    isActive: true,
    config: { tolerancePct: DEFAULT_AMOUNT_TOLERANCE_PCT, toleranceAbs: DEFAULT_AMOUNT_TOLERANCE_ABS }
  },
  {
    name: "Consistencia de fechas",
    ruleKey: ValidationRuleKey.date_consistency,
    documentType: ValidationDocumentType.ALL,
    severity: ValidationSeverity.WARN,
    isActive: true,
    config: { toleranceDays: DEFAULT_DATE_TOLERANCE_DAYS }
  },
  {
    name: "Consistencia de mercancía",
    ruleKey: ValidationRuleKey.merchandise_consistency,
    documentType: ValidationDocumentType.ALL,
    severity: ValidationSeverity.ERROR,
    isActive: true,
    config: { minCoverage: DEFAULT_MERCHANDISE_MIN_COVERAGE }
  }
];

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s./,;:|_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function flatten(input: unknown, prefix = ""): Array<{ key: string; value: string }> {
  if (input === null || input === undefined) return [];
  if (typeof input !== "object") return [{ key: prefix || "value", value: String(input) }];

  if (Array.isArray(input)) {
    const out: Array<{ key: string; value: string }> = [];
    input.forEach((entry, idx) => {
      const key = prefix ? `${prefix}[${idx}]` : `[${idx}]`;
      if (entry !== null && typeof entry === "object") out.push(...flatten(entry, key));
      else out.push({ key, value: String(entry ?? "") });
    });
    return out;
  }

  const out: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object") out.push(...flatten(v, key));
    else out.push({ key, value: String(v ?? "") });
  }
  return out;
}

function parseAmount(raw: string): number | null {
  const txt = raw.replace(/[^\d.,-]/g, "").trim();
  if (!txt) return null;
  const lastComma = txt.lastIndexOf(",");
  const lastDot = txt.lastIndexOf(".");
  const decimalSep = lastComma > lastDot ? "," : ".";
  const thousandsSep = decimalSep === "," ? "." : ",";
  const normalized = txt.split(thousandsSep).join("").replace(decimalSep, ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function parseAmountsFromText(raw: string): number[] {
  const matches = raw.match(/-?\d[\d.,\s]{0,20}\d|-?\d/g) ?? [];
  const values = matches
    .map((token) => parseAmount(token))
    .filter((n): n is number => n !== null);
  return values.filter((v) => Math.abs(v) >= 1);
}

function parseDate(raw: string): Date | null {
  const txt = raw.trim();
  if (!txt) return null;
  const dmy = txt.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime())) return date;
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

function tokenizeItems(raw: string) {
  const normalized = normalize(raw);
  const chunks = normalized
    .split(/[\n;|]/)
    .flatMap((chunk) => chunk.split(","))
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const out = new Set<string>();
  for (const chunk of chunks) {
    const cleaned = chunk.replace(/\b\d+[.,]?\d*\b/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) continue;
    const tokens = cleaned.split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t));
    if (tokens.length === 0) continue;
    out.add(tokens.slice(0, 6).join(" "));
  }
  return Array.from(out);
}

function canonicalizeDoc(doc: { id: string; fileName: string; extractedFields: unknown }): CanonicalDoc {
  const entries = flatten(doc.extractedFields ?? {});
  const amounts: CanonicalDoc["amounts"] = [];
  const ids: CanonicalDoc["ids"] = [];
  const dates: CanonicalDoc["dates"] = [];
  const items: CanonicalDoc["items"] = [];

  for (const entry of entries) {
    const keyNormalized = normalize(entry.key);
    const value = entry.value.trim();
    if (!value) continue;

    const amountLike = /(monto|total|importe|amount|neto|subtotal|iva|valor|precio)/.test(keyNormalized);
    if (amountLike) {
      const candidates = parseAmountsFromText(value);
      for (const amount of candidates) amounts.push({ key: entry.key, value, amount });
    }

    const idLike = /(rut|identificacion|identification|id_cliente|numero_documento|num_documento|dni|passport|pasaporte)/.test(keyNormalized);
    if (idLike) {
      const extracted = value.match(/\d{1,2}\.?\d{3}\.?\d{3}-?[0-9kK]|\d{6,12}[0-9kK]?/g) ?? [value];
      for (const rawId of extracted) {
        const normalized = normalizeId(rawId);
        if (normalized) ids.push({ key: entry.key, value: rawId, normalized });
      }
    }

    const dateLike = /(fecha|date|emision|vencimiento|recepcion|despacho|entrega)/.test(keyNormalized);
    if (dateLike) {
      const date = parseDate(value);
      if (date) dates.push({ key: entry.key, value, date });
    }

    const itemLike = /(mercancia|mercaderia|producto|productos|item|items|descripcion|detalle|articulo|sku|codigo)/.test(keyNormalized);
    if (itemLike) {
      const tokens = tokenizeItems(value);
      for (const normalizedToken of tokens) items.push({ key: entry.key, value, normalized: normalizedToken });
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

function amountPriority(key: string) {
  const n = normalize(key);
  if (/(monto_total|total_pagar|total_documento|monto final|total amount|importe total)/.test(n)) return 5;
  if (/total/.test(n)) return 4;
  if (/(subtotal|neto|importe)/.test(n)) return 3;
  if (/(iva|tax)/.test(n)) return 2;
  return 1;
}

function bestAmount(doc: CanonicalDoc) {
  if (doc.amounts.length === 0) return null;
  const sorted = [...doc.amounts].sort((a, b) => {
    const p = amountPriority(b.key) - amountPriority(a.key);
    if (p !== 0) return p;
    return Math.abs(b.amount) - Math.abs(a.amount);
  });
  return sorted[0] ?? null;
}

function numberConfig(config: RuleConfig | undefined, key: string, fallback: number) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return fallback;
  const value = (config as Record<string, unknown>)[key];
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function mismatchLevel(severity: ValidationSeverity): ValidationLevel {
  return severity === ValidationSeverity.WARN ? "WARN" : "ERROR";
}

function compareAmount(docA: CanonicalDoc, docB: CanonicalDoc, rule: RuntimeRule): ValidationFinding {
  const pair = `${docA.fileName} vs ${docB.fileName}`;
  const a = bestAmount(docA);
  const b = bestAmount(docB);
  const tolerancePct = numberConfig(rule.config, "tolerancePct", DEFAULT_AMOUNT_TOLERANCE_PCT);
  const toleranceAbs = numberConfig(rule.config, "toleranceAbs", DEFAULT_AMOUNT_TOLERANCE_ABS);
  if (!a || !b) {
    return {
      rule: "amount_consistency",
      title: rule.name,
      level: "WARN",
      verdict: "NOT_VERIFIABLE",
      pair,
      conclusion: "No verificable: no se detectó monto confiable en uno o ambos documentos.",
      evidence: [
        ...docA.amounts.slice(0, 2).map((x) => ({ documentId: docA.id, fileName: docA.fileName, value: `${x.key}: ${x.value}` })),
        ...docB.amounts.slice(0, 2).map((x) => ({ documentId: docB.id, fileName: docB.fileName, value: `${x.key}: ${x.value}` }))
      ]
    };
  }

  const absDiff = Math.abs(a.amount - b.amount);
  const relDiff = Math.abs(a.amount) > 0 ? absDiff / Math.abs(a.amount) : absDiff;
  const ok = relDiff <= tolerancePct || absDiff <= toleranceAbs;
  return {
    rule: "amount_consistency",
    title: rule.name,
    level: ok ? "OK" : mismatchLevel(rule.severity),
    verdict: ok ? "MATCH" : "MISMATCH",
    pair,
    conclusion: ok
      ? `Match: monto consistente (dif. ${absDiff.toFixed(2)} | ${(relDiff * 100).toFixed(2)}%).`
      : `Mismatch: diferencia de monto relevante (dif. ${absDiff.toFixed(2)} | ${(relDiff * 100).toFixed(2)}%).`,
    evidence: [
      { documentId: docA.id, fileName: docA.fileName, value: `${a.key}: ${a.value}` },
      { documentId: docB.id, fileName: docB.fileName, value: `${b.key}: ${b.value}` }
    ]
  };
}

function compareIdentification(docA: CanonicalDoc, docB: CanonicalDoc, operationRut: string, rule: RuntimeRule): ValidationFinding {
  const pair = `${docA.fileName} vs ${docB.fileName}`;
  const idsA = docA.ids.map((x) => x.normalized).filter(Boolean);
  const idsB = docB.ids.map((x) => x.normalized).filter(Boolean);
  const allIds = [...idsA, ...idsB];
  const operationId = normalizeId(operationRut);

  if (allIds.length === 0) {
    return {
      rule: "identification_consistency",
      title: rule.name,
      level: "WARN",
      verdict: "NOT_VERIFIABLE",
      pair,
      conclusion: "No verificable: no se encontró identificación útil en documentos comparados.",
      evidence: [
        ...docA.ids.slice(0, 2).map((x) => ({ documentId: docA.id, fileName: docA.fileName, value: `${x.key}: ${x.value}` })),
        ...docB.ids.slice(0, 2).map((x) => ({ documentId: docB.id, fileName: docB.fileName, value: `${x.key}: ${x.value}` }))
      ]
    };
  }

  const matchesOperation = allIds.some((x) => x === operationId || x.endsWith(operationId) || operationId.endsWith(x));
  const overlaps = idsA.some((a) => idsB.some((b) => a === b || a.endsWith(b) || b.endsWith(a)));
  const unique = new Set(allIds);
  const ok = overlaps || matchesOperation || unique.size === 1;

  return {
    rule: "identification_consistency",
    title: rule.name,
    level: ok ? "OK" : mismatchLevel(rule.severity),
    verdict: ok ? "MATCH" : "MISMATCH",
    pair,
    conclusion: ok ? "Match: identificación consistente entre documentos y operación." : "Mismatch: identificaciones inconsistentes entre documentos.",
    evidence: [
      ...docA.ids.slice(0, 2).map((x) => ({ documentId: docA.id, fileName: docA.fileName, value: `${x.key}: ${x.value}` })),
      ...docB.ids.slice(0, 2).map((x) => ({ documentId: docB.id, fileName: docB.fileName, value: `${x.key}: ${x.value}` })),
      { documentId: "operation", fileName: "operación", value: `Identificación operación: ${operationRut}` }
    ]
  };
}

function compareDate(docA: CanonicalDoc, docB: CanonicalDoc, rule: RuntimeRule): ValidationFinding {
  const pair = `${docA.fileName} vs ${docB.fileName}`;
  const toleranceDays = numberConfig(rule.config, "toleranceDays", DEFAULT_DATE_TOLERANCE_DAYS);
  if (docA.dates.length === 0 || docB.dates.length === 0) {
    return {
      rule: "date_consistency",
      title: rule.name,
      level: "WARN",
      verdict: "NOT_VERIFIABLE",
      pair,
      conclusion: "No verificable: faltan fechas en uno o ambos documentos.",
      evidence: [
        ...docA.dates.slice(0, 2).map((x) => ({ documentId: docA.id, fileName: docA.fileName, value: `${x.key}: ${x.value}` })),
        ...docB.dates.slice(0, 2).map((x) => ({ documentId: docB.id, fileName: docB.fileName, value: `${x.key}: ${x.value}` }))
      ]
    };
  }

  let minDiffDays = Number.POSITIVE_INFINITY;
  let bestA = docA.dates[0];
  let bestB = docB.dates[0];
  for (const a of docA.dates) {
    for (const b of docB.dates) {
      const days = Math.abs(a.date.getTime() - b.date.getTime()) / (1000 * 60 * 60 * 24);
      if (days < minDiffDays) {
        minDiffDays = days;
        bestA = a;
        bestB = b;
      }
    }
  }

  const ok = minDiffDays <= toleranceDays;
  return {
    rule: "date_consistency",
    title: rule.name,
    level: ok ? "OK" : mismatchLevel(rule.severity),
    verdict: ok ? "MATCH" : "MISMATCH",
    pair,
    conclusion: ok
      ? `Match: fechas dentro de tolerancia (${toleranceDays} días).`
      : `Mismatch: fechas fuera de tolerancia (${minDiffDays.toFixed(0)} días de diferencia).`,
    evidence: [
      { documentId: docA.id, fileName: docA.fileName, value: `${bestA.key}: ${bestA.value}` },
      { documentId: docB.id, fileName: docB.fileName, value: `${bestB.key}: ${bestB.value}` }
    ]
  };
}

function compareMerchandise(docA: CanonicalDoc, docB: CanonicalDoc, rule: RuntimeRule): ValidationFinding {
  const pair = `${docA.fileName} vs ${docB.fileName}`;
  const minCoverage = numberConfig(rule.config, "minCoverage", DEFAULT_MERCHANDISE_MIN_COVERAGE);
  const setA = new Set(docA.items.map((x) => x.normalized));
  const setB = new Set(docB.items.map((x) => x.normalized));
  if (setA.size === 0 || setB.size === 0) {
    return {
      rule: "merchandise_consistency",
      title: rule.name,
      level: "WARN",
      verdict: "NOT_VERIFIABLE",
      pair,
      conclusion: "No verificable: faltan ítems estructurados en uno o ambos documentos.",
      evidence: [
        ...docA.items.slice(0, 3).map((x) => ({ documentId: docA.id, fileName: docA.fileName, value: `${x.key}: ${x.value}` })),
        ...docB.items.slice(0, 3).map((x) => ({ documentId: docB.id, fileName: docB.fileName, value: `${x.key}: ${x.value}` }))
      ]
    };
  }

  const intersection = Array.from(setA).filter((x) => setB.has(x)).length;
  const minSize = Math.max(1, Math.min(setA.size, setB.size));
  const coverage = intersection / minSize;
  const ok = coverage >= minCoverage;
  return {
    rule: "merchandise_consistency",
    title: rule.name,
    level: ok ? "OK" : mismatchLevel(rule.severity),
    verdict: ok ? "MATCH" : "MISMATCH",
    pair,
    conclusion: ok
      ? `Match: mercancía alineada (${Math.round(coverage * 100)}% de cobertura).`
      : `Mismatch: baja coincidencia de mercancía (${Math.round(coverage * 100)}% de cobertura).`,
    evidence: [
      ...docA.items.slice(0, 3).map((x) => ({ documentId: docA.id, fileName: docA.fileName, value: `${x.key}: ${x.value}` })),
      ...docB.items.slice(0, 3).map((x) => ({ documentId: docB.id, fileName: docB.fileName, value: `${x.key}: ${x.value}` }))
    ]
  };
}

function pickOverall(findings: ValidationFinding[]): ValidationLevel {
  if (findings.some((f) => f.level === "ERROR")) return "ERROR";
  if (findings.some((f) => f.level === "WARN")) return "WARN";
  return "OK";
}

function docTypeToEnum(docType: CanonicalDoc["docType"]) {
  if (docType === "factura") return ValidationDocumentType.FACTURA;
  if (docType === "transporte") return ValidationDocumentType.TRANSPORTE;
  if (docType === "identidad") return ValidationDocumentType.IDENTIDAD;
  if (docType === "solicitud") return ValidationDocumentType.SOLICITUD;
  return ValidationDocumentType.OTRO;
}

function ruleApplies(rule: RuntimeRule, docA: CanonicalDoc, docB: CanonicalDoc) {
  if (!rule.isActive) return false;
  if (rule.documentType === ValidationDocumentType.ALL) return true;
  const a = docTypeToEnum(docA.docType);
  const b = docTypeToEnum(docB.docType);
  return rule.documentType === a || rule.documentType === b;
}

function pickComparisonPair(docs: CanonicalDoc[]) {
  const invoices = docs.filter((d) => d.docType === "factura");
  const transportDocs = docs.filter((d) => d.docType === "transporte");
  const idDocs = docs.filter((d) => d.docType === "identidad");

  if (invoices[0] && transportDocs[0]) return [invoices[0], transportDocs[0]] as const;
  if (invoices[0] && idDocs[0]) return [invoices[0], idDocs[0]] as const;
  if (docs[0] && docs[1]) return [docs[0], docs[1]] as const;
  return null;
}

async function computeValidation(operationId: string): Promise<ValidationSummary | null> {
  const operation = await prisma.operation.findUnique({
    where: { id: operationId },
    select: {
      id: true,
      clientRut: true,
      createdBy: { select: { companyId: true } },
      documents: {
        orderBy: { createdAt: "asc" },
        select: { id: true, fileName: true, extractedFields: true }
      }
    }
  });
  if (!operation) return null;

  const docs = operation.documents.map(canonicalizeDoc);
  const pair = pickComparisonPair(docs);
  if (!pair) {
    return {
      overall: "WARN",
      computedAt: new Date().toISOString(),
      findings: [
        {
          rule: "identification_consistency",
          title: "Consistencia documental",
          level: "WARN",
          verdict: "NOT_VERIFIABLE",
          pair: "N/A",
          conclusion: "No verificable: se requieren al menos dos documentos para comparar.",
          evidence: []
        }
      ]
    };
  }
  const [docA, docB] = pair;

  const dbRules = operation.createdBy.companyId
    ? await prisma.validationRule.findMany({
        where: { companyId: operation.createdBy.companyId, isActive: true },
        orderBy: { createdAt: "asc" }
      })
    : [];
  const runtimeRules: RuntimeRule[] = dbRules.length > 0 ? dbRules : DEFAULT_RULES;

  const findings: ValidationFinding[] = [];
  for (const rule of runtimeRules) {
    if (!ruleApplies(rule, docA, docB)) continue;
    if (rule.ruleKey === ValidationRuleKey.amount_consistency) findings.push(compareAmount(docA, docB, rule));
    else if (rule.ruleKey === ValidationRuleKey.identification_consistency) findings.push(compareIdentification(docA, docB, operation.clientRut, rule));
    else if (rule.ruleKey === ValidationRuleKey.date_consistency) findings.push(compareDate(docA, docB, rule));
    else if (rule.ruleKey === ValidationRuleKey.merchandise_consistency) findings.push(compareMerchandise(docA, docB, rule));
  }

  if (findings.length === 0) {
    findings.push({
      rule: "identification_consistency",
      title: "Reglas de validación",
      level: "WARN",
      verdict: "NOT_VERIFIABLE",
      pair: `${docA.fileName} vs ${docB.fileName}`,
      conclusion: "No hay reglas activas aplicables para esta operación/empresa.",
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
  if (session.role !== "ANALISTA") return NextResponse.json({ error: "Solo ANALISTA puede ejecutar validación" }, { status: 403 });

  const { id } = await params;
  const summary = await computeValidation(id);
  if (!summary) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

  const updated = await prisma.operation.update({
    where: { id },
    data: { validationSummary: summary as Prisma.InputJsonValue, validatedAt: new Date() },
    select: { validationSummary: true, validatedAt: true }
  });

  return NextResponse.json({
    validationSummary: updated.validationSummary,
    validatedAt: updated.validatedAt?.toISOString() ?? null
  });
}
