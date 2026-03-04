import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ReportType =
  | "operations_over_time"
  | "docs_by_type"
  | "top_clients"
  | "docs_by_client"
  | "ops_by_client_month"
  | "distribution_dashboard";
type ChartType = "line" | "bar" | "pie";

type Comparison = {
  label: string;
  current: number;
  previous: number;
  deltaPct: number;
};

const schema = z.object({
  prompt: z.string().optional(),
  reportType: z.enum(["operations_over_time", "docs_by_type", "top_clients", "docs_by_client", "ops_by_client_month", "distribution_dashboard"]).optional(),
  chartType: z.enum(["line", "bar", "pie"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  companyFilter: z.enum(["all", "banco", "aseguradora", "gestora"]).optional(),
  groupBy: z.enum(["document_type", "client", "mime"]).optional()
});

function parseDate(value?: string, fallback?: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function inferReportType(prompt?: string): ReportType {
  if (!prompt) return "operations_over_time";
  const p = normalize(prompt);

  if (p.includes("distribucion") || p.includes("dashboard") || p.includes("treemap")) return "distribution_dashboard";
  if ((p.includes("cliente") || p.includes("clientes")) && p.includes("mes") && p.includes("operac")) return "ops_by_client_month";
  if ((p.includes("document") || p.includes("docs")) && (p.includes("cliente") || p.includes("clientes"))) return "docs_by_client";
  if (p.includes("cliente") || p.includes("top") || p.includes("ranking")) return "top_clients";
  if (p.includes("document") || p.includes("tipo") || p.includes("pdf") || p.includes("imagen")) return "docs_by_type";
  return "operations_over_time";
}

function companyByOperationId(operationId: string): "banco" | "aseguradora" | "gestora" {
  const seed = operationId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const values: Array<"banco" | "aseguradora" | "gestora"> = ["banco", "aseguradora", "gestora"];
  return values[seed % values.length];
}

function inferChartType(fallback: ChartType, prompt?: string): ChartType {
  if (!prompt) return fallback;
  const p = normalize(prompt);
  if (p.includes("torta") || p.includes("pastel") || p.includes("pie chart") || p.includes("pie")) return "pie";
  if (p.includes("barra")) return "bar";
  if (p.includes("linea") || p.includes("línea")) return "line";
  return fallback;
}

function monthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Math.max(0, Number(m) - 1), 1);
  return d.toLocaleDateString("es-CL", { month: "short", year: "numeric" });
}

async function detectClientFromPrompt(prompt: string | undefined, dateFrom: Date, dateTo: Date) {
  if (!prompt) return null;
  const p = normalize(prompt);
  const clients = await prisma.operation.findMany({
    where: { createdAt: { gte: dateFrom, lte: dateTo } },
    distinct: ["clientName"],
    select: { clientName: true, clientRut: true }
  });

  let best: { clientName: string; clientRut: string; score: number } | null = null;

  for (const c of clients) {
    const normalizedName = normalize(c.clientName);
    const parts = normalizedName.split(" ").filter((x) => x.length >= 3);
    let score = 0;
    if (normalizedName && p.includes(normalizedName)) score += 100;
    for (const part of parts) {
      if (p.includes(part)) score += 5;
    }
    if (c.clientRut && p.includes(normalize(c.clientRut))) score += 80;
    if (score > 0 && (!best || score > best.score)) {
      best = { clientName: c.clientName, clientRut: c.clientRut, score };
    }
  }

  return best;
}

function inferPeriod(prompt?: string) {
  const now = new Date();
  let days = 30;

  if (prompt) {
    const p = normalize(prompt);
    if (p.includes("hoy")) days = 1;
    else if (p.includes("7 dias") || p.includes("7 días") || p.includes("seman")) days = 7;
    else if (p.includes("90 dias") || p.includes("90 días") || p.includes("trimestre")) days = 90;
  }

  const from = new Date(now);
  from.setDate(now.getDate() - days);
  return { from, to: now };
}

function mimeGroup(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Imagen";
  return "Otro";
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[]) {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function makeComparison(label: string, current: number, previous: number): Comparison {
  const deltaPct = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
  return { label, current, previous, deltaPct: Number(deltaPct.toFixed(1)) };
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ANALISTA") return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const reportType = body.data.reportType ?? inferReportType(body.data.prompt);
  const chartType = body.data.chartType ?? inferChartType(reportType === "operations_over_time" ? "line" : "bar", body.data.prompt);
  const inferred = inferPeriod(body.data.prompt);
  const dateFrom = parseDate(body.data.dateFrom, inferred.from) as Date;
  const dateTo = parseDate(body.data.dateTo, inferred.to) as Date;
  const companyFilter = body.data.companyFilter ?? "all";
  const groupBy = body.data.groupBy ?? "document_type";

  const rangeMs = Math.max(1, dateTo.getTime() - dateFrom.getTime());
  const previousTo = new Date(dateFrom.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - rangeMs);

  if (reportType === "operations_over_time") {
    const [ops, previousOps] = await Promise.all([
      prisma.operation.findMany({
        where: { createdAt: { gte: dateFrom, lte: dateTo } },
        orderBy: { createdAt: "asc" },
        include: { documents: true }
      }),
      prisma.operation.findMany({
        where: { createdAt: { gte: previousFrom, lte: previousTo } },
        include: { documents: true }
      })
    ]);

    const map = new Map<string, { operations: number; documents: number }>();
    for (const op of ops) {
      const key = new Date(op.createdAt).toLocaleDateString("es-CL");
      const prev = map.get(key) ?? { operations: 0, documents: 0 };
      prev.operations += 1;
      prev.documents += op.documents.length;
      map.set(key, prev);
    }

    const labels = Array.from(map.keys());
    const operationsData = labels.map((k) => map.get(k)?.operations ?? 0);
    const documentsData = labels.map((k) => map.get(k)?.documents ?? 0);

    const values = operationsData.length > 0 ? operationsData : [0];
    const threshold = mean(values) + 2 * std(values);
    const outliers = labels
      .map((label, i) => ({ label, value: operationsData[i] }))
      .filter((d) => d.value >= Math.max(2, threshold))
      .map((d) => `Pico detectado: ${d.label} con ${d.value} operaciones`);

    const currentDocs = ops.reduce((acc, op) => acc + op.documents.length, 0);
    const prevDocs = previousOps.reduce((acc, op) => acc + op.documents.length, 0);

    return NextResponse.json({
      reportType,
      title: "Evolución operacional",
      subtitle: "Operaciones y documentos por día",
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
        previousFrom: previousFrom.toISOString(),
        previousTo: previousTo.toISOString()
      },
      generatedAt: new Date().toISOString(),
      metrics: [
        { label: "Operaciones", value: ops.length },
        { label: "Documentos", value: currentDocs },
        { label: "Clientes únicos", value: new Set(ops.map((op) => `${op.clientName}|${op.clientRut}`)).size }
      ],
      comparison: [
        makeComparison("Operaciones vs período anterior", ops.length, previousOps.length),
        makeComparison("Documentos vs período anterior", currentDocs, prevDocs)
      ],
      outliers,
      chart: {
        type: chartType,
        labels,
        series: [
          { name: "Operaciones", data: operationsData },
          { name: "Documentos", data: documentsData }
        ]
      },
      rows: labels.map((label, i) => ({ fecha: label, operaciones: operationsData[i], documentos: documentsData[i] }))
    });
  }

  if (reportType === "distribution_dashboard") {
    const docs = await prisma.document.findMany({
      where: { operation: { createdAt: { gte: dateFrom, lte: dateTo } } },
      select: {
        id: true,
        mimeType: true,
        extractedFields: true,
        operation: { select: { id: true, clientName: true } }
      }
    });

    const filtered = docs.filter((doc) => {
      if (companyFilter === "all") return true;
      return companyByOperationId(doc.operation.id) === companyFilter;
    });

    function docTypeFromFields(value: unknown) {
      if (!value || typeof value !== "object") return "Otros";
      const obj = value as Record<string, unknown>;
      const raw = String(obj.tipo_documento ?? obj.tipoDocumento ?? obj.document_type ?? "").toLowerCase();
      if (!raw) return "Otros";
      if (raw.includes("factura")) return "Facturas";
      if (raw.includes("solicitud")) return "Solicitudes";
      if (raw.includes("transporte") || raw.includes("guia") || raw.includes("guía")) return "Doc. transporte";
      return "Otros";
    }

    const map = new Map<string, number>();
    for (const doc of filtered) {
      let key = "Otros";
      if (groupBy === "client") key = doc.operation.clientName;
      else if (groupBy === "mime") key = mimeGroup(doc.mimeType);
      else key = docTypeFromFields(doc.extractedFields);
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    const ranked = Array.from(map.entries())
      .map(([group, documentos]) => ({ group, documentos }))
      .sort((a, b) => b.documentos - a.documentos)
      .slice(0, 18);

    const total = filtered.length;
    const top = ranked[0];
    const topPct = total > 0 && top ? ((top.documentos / total) * 100).toFixed(1) : "0.0";

    return NextResponse.json({
      reportType,
      title: "Panel de distribución documental",
      subtitle: `Filtro empresa: ${companyFilter === "all" ? "Todas" : companyFilter} · Agrupado por ${
        groupBy === "client" ? "cliente" : groupBy === "mime" ? "mime" : "tipo documental"
      }`,
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
        previousFrom: previousFrom.toISOString(),
        previousTo: previousTo.toISOString()
      },
      generatedAt: new Date().toISOString(),
      metrics: [
        { label: "Documentos", value: total },
        { label: "Grupos", value: ranked.length },
        { label: "Mayor concentración", value: top ? `${top.group} (${topPct}%)` : "N/A" }
      ],
      comparison: [],
      outliers: top ? [`Grupo dominante: ${top.group} con ${top.documentos} documentos`] : [],
      chart: {
        type: "pie",
        labels: ranked.map((r) => r.group),
        series: [{ name: "Documentos", data: ranked.map((r) => r.documentos) }]
      },
      rows: ranked.map((r) => ({ grupo: r.group, documentos: r.documentos }))
    });
  }

  if (reportType === "docs_by_type") {
    const [docs, previousDocs] = await Promise.all([
      prisma.document.findMany({
        where: { operation: { createdAt: { gte: dateFrom, lte: dateTo } } },
        select: { mimeType: true }
      }),
      prisma.document.findMany({
        where: { operation: { createdAt: { gte: previousFrom, lte: previousTo } } },
        select: { mimeType: true }
      })
    ]);

    const counter = new Map<string, number>();
    for (const doc of docs) {
      const key = mimeGroup(doc.mimeType);
      counter.set(key, (counter.get(key) ?? 0) + 1);
    }

    const labels = ["PDF", "Imagen", "Otro"];
    const data = labels.map((label) => counter.get(label) ?? 0);
    const total = data.reduce((a, b) => a + b, 0);

    const dominantIdx = data.findIndex((x) => x === Math.max(...data));
    const dominantPct = total > 0 ? (data[dominantIdx] / total) * 100 : 0;
    const outliers = dominantPct >= 70 ? [`Alta concentración en ${labels[dominantIdx]} (${dominantPct.toFixed(0)}%)`] : [];

    return NextResponse.json({
      reportType,
      title: "Distribución documental",
      subtitle: "Tipos de documento cargados",
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
        previousFrom: previousFrom.toISOString(),
        previousTo: previousTo.toISOString()
      },
      generatedAt: new Date().toISOString(),
      metrics: [
        { label: "Total docs", value: total },
        { label: "PDF", value: data[0] },
        { label: "Imágenes", value: data[1] }
      ],
      comparison: [makeComparison("Total docs vs período anterior", total, previousDocs.length)],
      outliers,
      chart: {
        type: chartType,
        labels,
        series: [{ name: "Documentos", data }]
      },
      rows: labels.map((label, i) => ({
        tipo: label,
        cantidad: data[i],
        porcentaje: total ? `${Math.round((data[i] / total) * 100)}%` : "0%"
      }))
    });
  }

  if (reportType === "docs_by_client") {
    const [ops, previousOps] = await Promise.all([
      prisma.operation.findMany({
        where: { createdAt: { gte: dateFrom, lte: dateTo } },
        include: { documents: true }
      }),
      prisma.operation.findMany({
        where: { createdAt: { gte: previousFrom, lte: previousTo } },
        include: { documents: true }
      })
    ]);

    const map = new Map<string, { identificacion: string; documentos: number; operaciones: number }>();
    for (const op of ops) {
      const prev = map.get(op.clientName) ?? { identificacion: op.clientRut, documentos: 0, operaciones: 0 };
      prev.operaciones += 1;
      prev.documentos += op.documents.length;
      map.set(op.clientName, prev);
    }

    const ranking = Array.from(map.entries())
      .map(([cliente, data]) => ({ cliente, ...data }))
      .sort((a, b) => b.documentos - a.documentos)
      .slice(0, 12);

    const currentDocs = ops.reduce((acc, op) => acc + op.documents.length, 0);
    const previousDocs = previousOps.reduce((acc, op) => acc + op.documents.length, 0);

    return NextResponse.json({
      reportType,
      title: "Documentos por cliente",
      subtitle: "Ranking por volumen documental",
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
        previousFrom: previousFrom.toISOString(),
        previousTo: previousTo.toISOString()
      },
      generatedAt: new Date().toISOString(),
      metrics: [
        { label: "Clientes", value: ranking.length },
        { label: "Documentos", value: currentDocs },
        { label: "Promedio docs/cliente", value: ranking.length ? (currentDocs / ranking.length).toFixed(1) : 0 }
      ],
      comparison: [makeComparison("Documentos vs período anterior", currentDocs, previousDocs)],
      outliers: ranking.filter((r) => r.documentos >= Math.max(5, mean(ranking.map((x) => x.documentos)) + std(ranking.map((x) => x.documentos))))
        .map((r) => `Cliente con alta carga documental: ${r.cliente} (${r.documentos} documentos)`),
      chart: {
        type: chartType === "line" ? "bar" : chartType,
        labels: ranking.map((r) => r.cliente),
        series: [{ name: "Documentos", data: ranking.map((r) => r.documentos) }]
      },
      rows: ranking
    });
  }

  if (reportType === "ops_by_client_month") {
    const detectedClient = await detectClientFromPrompt(body.data.prompt, dateFrom, dateTo);
    const clientWhere = detectedClient
      ? {
          OR: [
            { clientName: detectedClient.clientName },
            { clientRut: detectedClient.clientRut }
          ]
        }
      : undefined;

    const [ops, previousOps] = await Promise.all([
      prisma.operation.findMany({
        where: {
          createdAt: { gte: dateFrom, lte: dateTo },
          ...(clientWhere ?? {})
        },
        orderBy: { createdAt: "asc" },
        include: { documents: true }
      }),
      prisma.operation.findMany({
        where: {
          createdAt: { gte: previousFrom, lte: previousTo },
          ...(clientWhere ?? {})
        },
        include: { documents: true }
      })
    ]);

    const byMonth = new Map<string, { operaciones: number; documentos: number }>();
    for (const op of ops) {
      const key = monthKey(op.createdAt);
      const prev = byMonth.get(key) ?? { operaciones: 0, documentos: 0 };
      prev.operaciones += 1;
      prev.documentos += op.documents.length;
      byMonth.set(key, prev);
    }

    const monthKeys = Array.from(byMonth.keys()).sort();
    const labels = monthKeys.map(monthLabel);
    const opsSeries = monthKeys.map((k) => byMonth.get(k)?.operaciones ?? 0);
    const docsSeries = monthKeys.map((k) => byMonth.get(k)?.documentos ?? 0);

    const effectiveClientName =
      detectedClient?.clientName ??
      (ops[0]?.clientName ? ops[0].clientName : "Cliente no identificado en prompt");

    const currentDocs = ops.reduce((acc, op) => acc + op.documents.length, 0);
    const prevDocs = previousOps.reduce((acc, op) => acc + op.documents.length, 0);

    return NextResponse.json({
      reportType,
      title: "Operaciones por cliente por mes",
      subtitle: detectedClient
        ? `Evolución mensual de ${detectedClient.clientName}`
        : "Evolución mensual para el cliente detectado en el período (si aplica)",
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
        previousFrom: previousFrom.toISOString(),
        previousTo: previousTo.toISOString()
      },
      generatedAt: new Date().toISOString(),
      metrics: [
        { label: "Cliente", value: effectiveClientName },
        { label: "Operaciones", value: ops.length },
        { label: "Documentos", value: currentDocs }
      ],
      comparison: [
        makeComparison("Operaciones vs período anterior", ops.length, previousOps.length),
        makeComparison("Documentos vs período anterior", currentDocs, prevDocs)
      ],
      outliers: labels
        .map((label, i) => ({ label, value: opsSeries[i] ?? 0 }))
        .filter((r) => r.value >= Math.max(2, mean(opsSeries) + std(opsSeries)))
        .map((r) => `Mes con mayor actividad: ${r.label} (${r.value} operaciones)`),
      chart: {
        type: chartType === "pie" ? "bar" : chartType,
        labels,
        series: [
          { name: "Operaciones", data: opsSeries },
          { name: "Documentos", data: docsSeries }
        ]
      },
      rows: monthKeys.map((k, i) => ({
        mes: monthLabel(k),
        cliente: effectiveClientName,
        operaciones: opsSeries[i],
        documentos: docsSeries[i]
      }))
    });
  }

  const [ops, previousOps] = await Promise.all([
    prisma.operation.findMany({
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      include: { documents: true }
    }),
    prisma.operation.findMany({
      where: { createdAt: { gte: previousFrom, lte: previousTo } },
      include: { documents: true }
    })
  ]);

  const map = new Map<string, { identificacion: string; operaciones: number; documentos: number }>();
  for (const op of ops) {
    const key = op.clientName;
    const prev = map.get(key) ?? { identificacion: op.clientRut, operaciones: 0, documentos: 0 };
    prev.operaciones += 1;
    prev.documentos += op.documents.length;
    map.set(key, prev);
  }

  const ranking = Array.from(map.entries())
    .map(([cliente, data]) => ({ cliente, ...data }))
    .sort((a, b) => b.operaciones - a.operaciones)
    .slice(0, 10);

  const values = ranking.map((r) => r.operaciones);
  const threshold = mean(values) + std(values);
  const outliers = ranking
    .filter((r) => r.operaciones >= Math.max(3, threshold))
    .map((r) => `Cliente atípico: ${r.cliente} (${r.operaciones} operaciones)`);

  return NextResponse.json({
    reportType,
    title: "Clientes con mayor actividad",
    subtitle: "Ranking por volumen de operaciones",
    period: {
      from: dateFrom.toISOString(),
      to: dateTo.toISOString(),
      previousFrom: previousFrom.toISOString(),
      previousTo: previousTo.toISOString()
    },
    generatedAt: new Date().toISOString(),
    metrics: [
      { label: "Clientes", value: ranking.length },
      { label: "Operaciones", value: ops.length },
      { label: "Promedio ops/cliente", value: ranking.length ? (ops.length / ranking.length).toFixed(1) : 0 }
    ],
    comparison: [makeComparison("Operaciones vs período anterior", ops.length, previousOps.length)],
    outliers,
    chart: {
      type: chartType,
      labels: ranking.map((r) => r.cliente),
      series: [{ name: "Operaciones", data: ranking.map((r) => r.operaciones) }]
    },
    rows: ranking
  });
}
