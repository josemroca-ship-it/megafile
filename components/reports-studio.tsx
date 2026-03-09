"use client";

import { BarChart3, Download, FileText, LineChart, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n";

type ReportType =
  | "operations_over_time"
  | "docs_by_type"
  | "top_clients"
  | "docs_by_client"
  | "ops_by_client_month"
  | "distribution_dashboard"
  | "validation_quality";
type ReportTypeOption = ReportType | "auto";
type ChartType = "line" | "bar" | "pie";

type ReportResponse = {
  reportType: ReportType;
  title: string;
  subtitle: string;
  generatedAt: string;
  period: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
  };
  metrics: Array<{ label: string; value: string | number }>;
  comparison: Array<{ label: string; current: number; previous: number; deltaPct: number }>;
  outliers: string[];
  chart: {
    type: ChartType;
    labels: string[];
    series: Array<{ name: string; data: number[] }>;
  };
  rows: Array<Record<string, string | number>>;
};

type CompanyOption = {
  id: string;
  name: string;
};

const QUICK_REPORTS: Array<{ label: string; prompt: string; forceReportType?: ReportType; forceChartType?: ChartType }> = [
  { label: "Evolución 30 días", prompt: "reporte de evolución de operaciones de los últimos 30 días" },
  { label: "Tipos de documento", prompt: "reporte de tipos de documento cargados" },
  { label: "Top clientes", prompt: "ranking top clientes por operaciones" },
  { label: "Docs por cliente", prompt: "gráfico de barras de cantidad de documentos por cliente" },
  { label: "Ops cliente por mes", prompt: "cantidad de operaciones de un cliente por mes" },
  {
    label: "Panel distribución",
    prompt: "panel de distribución documental con donut y treemap por tipo documental",
    forceReportType: "distribution_dashboard",
    forceChartType: "pie"
  },
  {
    label: "Calidad validación",
    prompt: "reporte de precisión y mismatch de validación automática por tipo documental",
    forceReportType: "validation_quality",
    forceChartType: "bar"
  }
];

function LineChartSimple({ labels, series }: { labels: string[]; series: Array<{ name: string; data: number[] }> }) {
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const width = 760;
  const height = 240;
  const pad = 28;

  function points(values: number[]) {
    if (values.length <= 1) {
      const y = height - pad - (values[0] / max) * (height - pad * 2);
      return `${pad},${y} ${width - pad},${y}`;
    }
    return values
      .map((value, i) => {
        const x = pad + (i / (values.length - 1)) * (width - pad * 2);
        const y = height - pad - (value / max) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }

  const colors = ["#06b6d4", "#2563eb", "#14b8a6"];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-[760px] min-w-[760px]">
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#dbeafe" />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#dbeafe" />
        {series.map((s, idx) => (
          <polyline key={s.name} fill="none" stroke={colors[idx % colors.length]} strokeWidth="3" points={points(s.data)} />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
        {series.map((s, idx) => (
          <span key={s.name} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
            {s.name}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Eje X: {labels.join(" · ")}</p>
    </div>
  );
}

function BarChartSimple({ labels, series }: { labels: string[]; series: Array<{ name: string; data: number[] }> }) {
  const allValues = series.flatMap((s) => s.data);
  const max = Math.max(1, ...allValues);
  const colors = ["from-cyan-500 to-blue-500", "from-emerald-500 to-teal-500", "from-indigo-500 to-cyan-500"];

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-3 text-xs text-slate-600">
          {series.map((s, i) => (
            <span key={s.name} className="inline-flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-cyan-500" : i === 1 ? "bg-emerald-500" : "bg-indigo-500"}`} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      {labels.map((label, idx) => {
        return (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-600">
              <span className="truncate pr-3">{label}</span>
              <span className="text-right">
                {series.map((s) => `${s.name}: ${s.data[idx] ?? 0}`).join(" · ")}
              </span>
            </div>
            <div className="space-y-1.5">
              {series.map((s, i) => {
                const value = s.data[idx] ?? 0;
                const pct = Math.round((value / max) * 100);
                return (
                  <div key={`${label}-${s.name}`} className="h-2.5 rounded-full bg-slate-100">
                    <div className={`h-2.5 rounded-full bg-gradient-to-r ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PieChartSimple({ labels, series }: { labels: string[]; series: Array<{ name: string; data: number[] }> }) {
  const data = series[0]?.data ?? [];
  const total = Math.max(1, data.reduce((a, b) => a + b, 0));
  const colors = ["#06b6d4", "#2563eb", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#22c55e"];
  const radius = 78;
  const center = 95;
  let acc = 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-4">
        <svg width="190" height="190" viewBox="0 0 190 190" className="shrink-0">
          {data.map((value, idx) => {
            const start = (acc / total) * Math.PI * 2;
            acc += value;
            const end = (acc / total) * Math.PI * 2;

            const x1 = center + radius * Math.cos(start);
            const y1 = center + radius * Math.sin(start);
            const x2 = center + radius * Math.cos(end);
            const y2 = center + radius * Math.sin(end);
            const largeArc = end - start > Math.PI ? 1 : 0;

            const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            return <path key={`${labels[idx]}-${value}`} d={path} fill={colors[idx % colors.length]} />;
          })}
          <circle cx={center} cy={center} r="34" fill="white" />
          <text x={center} y={center + 4} textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold">
            Total {total}
          </text>
        </svg>

        <div className="grid gap-2 text-xs text-slate-700">
          {labels.map((label, idx) => {
            const value = data[idx] ?? 0;
            const pct = Math.round((value / total) * 100);
            return (
              <p key={label} className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                {label}: {value} ({pct}%)
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TreemapBlocks({ rows }: { rows: Array<Record<string, string | number>> }) {
  const normalized = rows
    .map((row) => ({
      label: String(row.grupo ?? row.cliente ?? row.tipo ?? "N/A"),
      value: Number(row.documentos ?? row.cantidad ?? 0)
    }))
    .filter((r) => r.value > 0);

  const total = Math.max(1, normalized.reduce((acc, r) => acc + r.value, 0));
  const colors = [
    "bg-cyan-400/90",
    "bg-emerald-400/90",
    "bg-blue-400/90",
    "bg-amber-400/90",
    "bg-violet-400/90",
    "bg-fuchsia-400/90",
    "bg-lime-400/90",
    "bg-rose-400/90"
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Treemap de distribución</p>
      <div className="grid grid-cols-6 gap-2">
        {normalized.map((item, idx) => {
          const span = Math.max(1, Math.min(6, Math.round((item.value / total) * 10)));
          return (
            <div
              key={`${item.label}-${idx}`}
              className={`rounded-lg p-2 text-[11px] font-semibold text-slate-900 ${colors[idx % colors.length]}`}
              style={{ gridColumn: `span ${span} / span ${span}` }}
            >
              <p className="truncate">{item.label}</p>
              <p className="text-[10px] font-medium text-slate-800">{item.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function toCsv(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const txt = String(value ?? "");
    if (txt.includes(",") || txt.includes("\n") || txt.includes('"')) {
      return `"${txt.replace(/"/g, '""')}"`;
    }
    return txt;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(","))].join("\n");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL");
}

export function ReportsStudio({ lang }: { lang: Lang }) {
  const t = lang === "en"
    ? {
        aiReports: "AI Reports",
        title: "Reports and charts generator",
        subtitle: "Ask for a report by prompt or select a template to visualize and export data.",
        placeholder: "Ex: report of document types uploaded in the last month",
        generate: "Generate report",
        generating: "Generating...",
        exportCsv: "Export CSV",
        exportPdf: "Export PDF",
        autoByPrompt: "Auto by prompt",
        period: "Period:"
      }
    : {
        aiReports: "Reportes IA",
        title: "Generador de reportes y gráficas",
        subtitle: "Pide un reporte por prompt o selecciona una plantilla para ver análisis y exportar datos.",
        placeholder: "Ej: reporte de tipos de documento cargados en el último mes",
        generate: "Generar reporte",
        generating: "Generando...",
        exportCsv: "Exportar CSV",
        exportPdf: "Exportar PDF",
        autoByPrompt: "Auto por prompt",
        period: "Período:"
      };
  const [prompt, setPrompt] = useState("");
  const [reportType, setReportType] = useState<ReportTypeOption>("auto");
  const [chartType, setChartType] = useState<ChartType>("pie");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [groupBy, setGroupBy] = useState<"document_type" | "client" | "mime" | "company" | "rule">("document_type");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);

  const csvData = useMemo(() => (report ? toCsv(report.rows) : ""), [report]);

  useEffect(() => {
    let cancelled = false;
    async function loadCompanies() {
      const response = await fetch("/api/companies");
      const data = (await response.json().catch(() => null)) as { companies?: CompanyOption[] } | null;
      if (!cancelled && response.ok && data?.companies) setCompanyOptions(data.companies);
    }
    void loadCompanies();
    return () => {
      cancelled = true;
    };
  }, []);

  async function generate(customPrompt?: string) {
    setLoading(true);
    setError(null);
    const effectiveReportType =
      reportType === "auto"
        ? companyFilter !== "all" || groupBy !== "document_type"
          ? "distribution_dashboard"
          : undefined
        : reportType;

    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: customPrompt ?? prompt,
        reportType: effectiveReportType,
        chartType,
        companyFilter,
        groupBy
      })
    });

    const data = (await response.json().catch(() => null)) as ReportResponse | { error?: string } | null;

    if (!response.ok || !data || "error" in data) {
      setError((data as { error?: string } | null)?.error ?? "No se pudo generar el reporte.");
      setLoading(false);
      return;
    }

    setReport(data as ReportResponse);
    setLoading(false);
  }

  function downloadCsv() {
    if (!report || !csvData) return;
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${report.reportType}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    if (!report) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    let y = 40;
    try {
      const logoRes = await fetch("/sonda_megafy.jpg");
      if (logoRes.ok) {
        const logoBlob = await logoRes.blob();
        const logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("No fue posible leer el logo"));
          reader.readAsDataURL(logoBlob);
        });
        const logoFormat = logoDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(logoDataUrl, logoFormat, 40, y, 120, 36, undefined, "FAST");
        y += 48;
      } else {
        throw new Error("Logo no disponible");
      }
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Megafy", 40, y + 8);
      y += 24;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(report.title, 40, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(report.subtitle, 40, y);
    y += 16;
    doc.text(`Período: ${formatDate(report.period.from)} - ${formatDate(report.period.to)}`, 40, y);
    y += 14;
    doc.text(`Generado: ${new Date(report.generatedAt).toLocaleString("es-CL")}`, 40, y);
    y += 20;

    doc.setFont("helvetica", "bold");
    doc.text("Métricas", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    report.metrics.forEach((m) => {
      doc.text(`- ${m.label}: ${m.value}`, 48, y);
      y += 13;
    });

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Comparación vs período anterior", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    report.comparison.forEach((c) => {
      const sign = c.deltaPct > 0 ? "+" : "";
      doc.text(`- ${c.label}: ${c.current} vs ${c.previous} (${sign}${c.deltaPct}%)`, 48, y);
      y += 13;
    });

    if (report.outliers.length > 0) {
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Outliers detectados", 40, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      report.outliers.forEach((o) => {
        doc.text(`- ${o}`, 48, y);
        y += 13;
      });
    }

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Muestra de datos", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");

    const sample = report.rows.slice(0, 15);
    sample.forEach((row) => {
      const line = Object.entries(row)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(" | ");
      const lines = doc.splitTextToSize(line, 510);
      doc.text(lines, 48, y);
      y += lines.length * 12 + 2;
      if (y > 760) {
        doc.addPage();
        y = 48;
      }
    });

    doc.save(`reporte-${report.reportType}.pdf`);
  }

  return (
    <section className="space-y-5">
      <article className="bank-card p-6 md:p-8">
        <div className="flex items-center gap-2 text-cyan-700">
          <Sparkles size={18} />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">{t.aiReports}</p>
        </div>
        <h2 className="mt-2 font-display text-3xl text-navy">{t.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>

        <form
          className="mt-5 grid gap-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void generate();
          }}
        >
          <textarea
            className="bank-input min-h-24"
            placeholder={t.placeholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportTypeOption)}
            >
              <option value="auto">{t.autoByPrompt}</option>
              <option value="operations_over_time">Evolución operacional</option>
              <option value="docs_by_type">Distribución documental</option>
              <option value="top_clients">Top clientes</option>
              <option value="docs_by_client">Documentos por cliente</option>
              <option value="ops_by_client_month">Operaciones cliente por mes</option>
              <option value="distribution_dashboard">Panel distribución (donut + treemap)</option>
              <option value="validation_quality">Calidad validación automática</option>
            </select>
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={chartType}
              onChange={(e) => setChartType(e.target.value as ChartType)}
            >
              <option value="pie">Gráfico torta</option>
              <option value="bar">Gráfico barras</option>
              <option value="line">Gráfico línea</option>
            </select>
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <option value="all">Empresa: Todas</option>
              {companyOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  Empresa: {company.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "document_type" | "client" | "mime" | "company" | "rule")}
            >
              <option value="document_type">Agrupar: Tipo documental</option>
              <option value="client">Agrupar: Cliente</option>
              <option value="mime">Agrupar: MIME</option>
              <option value="company">Agrupar: Empresa</option>
              <option value="rule">Agrupar: Regla validación</option>
            </select>

            <button className="bank-btn inline-flex items-center gap-2" type="submit" disabled={loading}>
              <BarChart3 size={16} />
              {loading ? t.generating : t.generate}
            </button>

            <button
              type="button"
              className="bank-btn-secondary inline-flex items-center gap-2"
              onClick={downloadCsv}
              disabled={!report}
            >
              <Download size={16} /> {t.exportCsv}
            </button>

            <button
              type="button"
              className="bank-btn-secondary inline-flex items-center gap-2"
              onClick={() => void downloadPdf()}
              disabled={!report}
            >
              <Download size={16} /> {t.exportPdf}
            </button>
          </div>
          <p className="text-xs text-slate-500">Tip: usa &quot;Panel distribución&quot; o &quot;Calidad validación&quot; desde el selector o chips rápidos.</p>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_REPORTS.map((item) => (
            <button
              key={item.label}
              type="button"
              className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
              onClick={() => {
                setPrompt(item.prompt);
                if (item.forceReportType) setReportType(item.forceReportType);
                if (item.forceChartType) setChartType(item.forceChartType);
                void generate(item.prompt);
              }}
              disabled={loading}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </article>

      {report && (
        <article className="bank-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-2xl text-navy">{report.title}</h3>
              <p className="text-sm text-slate-600">{report.subtitle}</p>
            </div>
            <div className="bank-chip">{report.reportType}</div>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            {t.period} {formatDate(report.period.from)} - {formatDate(report.period.to)} · Comparado con {formatDate(report.period.previousFrom)} - {formatDate(report.period.previousTo)}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {report.metrics.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{metric.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{metric.value}</p>
              </div>
            ))}
          </div>

          {report.comparison.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {report.comparison.map((c) => (
                <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <p className="font-semibold text-slate-800">{c.label}</p>
                  <p className="mt-1 text-slate-600">
                    Actual <strong>{c.current}</strong> vs anterior <strong>{c.previous}</strong>
                  </p>
                  <p className={`mt-1 font-semibold ${c.deltaPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {c.deltaPct >= 0 ? "+" : ""}
                    {c.deltaPct}%
                  </p>
                </div>
              ))}
            </div>
          )}

          {report.outliers.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="font-semibold text-amber-900">Outliers detectados</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
                {report.outliers.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5">
            {report.reportType === "distribution_dashboard" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <PieChartSimple labels={report.chart.labels} series={report.chart.series} />
                <TreemapBlocks rows={report.rows} />
              </div>
            ) : report.chart.type === "line" ? (
              <LineChartSimple labels={report.chart.labels} series={report.chart.series} />
            ) : report.chart.type === "pie" ? (
              <PieChartSimple labels={report.chart.labels} series={report.chart.series} />
            ) : (
              <BarChartSimple labels={report.chart.labels} series={report.chart.series} />
            )}
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  {Object.keys(report.rows[0] ?? { registro: "" }).map((key) => (
                    <th key={key} className="px-3 py-2">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    {Object.keys(report.rows[0] ?? { registro: "" }).map((key) => (
                      <td key={`${idx}-${key}`} className="px-3 py-2 text-slate-700">
                        {String(row[key] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
                {report.rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={99}>
                      Sin datos para el período seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {!report && (
        <article className="bank-card p-6 text-sm text-slate-600">
          <p className="inline-flex items-center gap-2">
            <LineChart size={16} />
            Genera tu primer reporte para visualizar tendencias y exportar datos.
          </p>
          <p className="mt-2 inline-flex items-center gap-2">
            <FileText size={16} />
            Incluye comparación de períodos y detección automática de outliers.
          </p>
        </article>
      )}
    </section>
  );
}
