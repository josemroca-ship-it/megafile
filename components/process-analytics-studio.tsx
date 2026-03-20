"use client";

import { BarChart3, Bot, Download, Send } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type ProcessType = "preadmision" | "citas" | "comex";

type ChatMessage = {
  id: string;
  role: "agent" | "user";
  text: string;
};

type GeneratedReport = {
  title: string;
  subtitle: string;
  labels: string[];
  values: number[];
  valueLabel: string;
  sql?: string;
  rows: Array<Record<string, string | number>>;
};

type SqlAssistantResponse = {
  process: ProcessType;
  title: string;
  subtitle: string;
  sql: string;
  rows: Array<{ label: string; value: number }>;
  insight: string;
};

const PROCESS_OPTIONS: Array<{ id: ProcessType; label: string }> = [
  { id: "preadmision", label: "Preadmisión" },
  { id: "citas", label: "Confirmación de horas" },
  { id: "comex", label: "COMEX" }
];

const DASHBOARD_DATA = {
  preadmision: {
    kpis: [
      { label: "Preadmisiones totales", value: "412" },
      { label: "Finalizadas", value: "358" },
      { label: "Tiempo promedio", value: "1.8 días" },
      { label: "Tasa de finalización", value: "86.9%" }
    ],
    byStatus: [
      { label: "Pendiente", value: 42 },
      { label: "Validando documentos", value: 31 },
      { label: "Firma pendiente", value: 24 },
      { label: "Finalizada", value: 358 },
      { label: "Con incidencia", value: 12 }
    ],
    byGender: [
      { label: "Femenino", value: 224 },
      { label: "Masculino", value: 173 },
      { label: "No informado", value: 15 }
    ],
    byMonth: [
      { label: "Ene", value: 52 },
      { label: "Feb", value: 60 },
      { label: "Mar", value: 68 },
      { label: "Abr", value: 71 },
      { label: "May", value: 74 },
      { label: "Jun", value: 87 }
    ]
  },
  citas: {
    kpis: [
      { label: "Citas gestionadas", value: "1,284" },
      { label: "Confirmadas", value: "914" },
      { label: "Anuladas", value: "301" },
      { label: "Reagendadas", value: "69" }
    ],
    confirmationSplit: [
      { label: "Confirmadas", value: 914 },
      { label: "Anuladas", value: 301 },
      { label: "Sin respuesta", value: 69 }
    ],
    cancellationReasons: [
      { label: "No puede en horario", value: 138 },
      { label: "Precio", value: 79 },
      { label: "Cambio de doctor", value: 52 },
      { label: "Otros motivos", value: 32 }
    ],
    trend: [
      { label: "Sem 1", value: 210 },
      { label: "Sem 2", value: 228 },
      { label: "Sem 3", value: 246 },
      { label: "Sem 4", value: 230 },
      { label: "Sem 5", value: 239 },
      { label: "Sem 6", value: 262 }
    ]
  },
  comex: {
    kpis: [
      { label: "Operaciones", value: "268" },
      { label: "Firmadas", value: "211" },
      { label: "En revisión", value: "39" },
      { label: "Monto mensual", value: "USD 8.2M" }
    ],
    byStatus: [
      { label: "Pendiente documentos", value: 44 },
      { label: "Revisión IA", value: 39 },
      { label: "Contrato listo", value: 24 },
      { label: "Firmada", value: 211 }
    ],
    byCurrency: [
      { label: "USD", value: 176 },
      { label: "EUR", value: 54 },
      { label: "CLP", value: 38 }
    ],
    byMonth: [
      { label: "Ene", value: 34 },
      { label: "Feb", value: 41 },
      { label: "Mar", value: 45 },
      { label: "Abr", value: 43 },
      { label: "May", value: 49 },
      { label: "Jun", value: 56 }
    ]
  }
} as const;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function Bars({ data, color = "bg-cyan-500" }: { data: ReadonlyArray<{ label: string; value: number }>; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      {data.map((row) => {
        const width = Math.max(6, Math.round((row.value / max) * 100));
        return (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
              <span>{row.label}</span>
              <span className="font-semibold text-slate-900">{row.value}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100">
              <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendBars({ data }: { data: ReadonlyArray<{ label: string; value: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex h-44 items-end gap-2">
        {data.map((point) => {
          const h = Math.max(10, Math.round((point.value / max) * 100));
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t-md bg-gradient-to-t from-cyan-500 to-blue-500" style={{ height: `${h}%` }} />
              <p className="text-[10px] text-slate-500">{point.label}</p>
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
    if (txt.includes(",") || txt.includes("\n") || txt.includes('"')) return `"${txt.replace(/"/g, '""')}"`;
    return txt;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(","))].join("\n");
}

function buildReport(question: string, selected: ProcessType): { process: ProcessType; report: GeneratedReport; answer: string } {
  const q = normalizeText(question);
  let process: ProcessType = selected;
  if (q.includes("cita") || q.includes("hora")) process = "citas";
  if (q.includes("preadmision") || q.includes("paciente") || q.includes("genero")) process = "preadmision";
  if (q.includes("comex") || q.includes("importacion") || q.includes("exportacion")) process = "comex";

  if (process === "citas") {
    if (q.includes("motivo") || q.includes("anul")) {
      const labels = DASHBOARD_DATA.citas.cancellationReasons.map((x) => x.label);
      const values = DASHBOARD_DATA.citas.cancellationReasons.map((x) => x.value);
      return {
        process,
        answer: "📊 Preparé un reporte de anulaciones por motivo. El principal motivo es incompatibilidad de horario.",
        report: {
          title: "Anulaciones por motivo",
          subtitle: "Confirmación de horas · Último periodo",
          labels,
          values,
          valueLabel: "Pacientes",
          rows: DASHBOARD_DATA.citas.cancellationReasons.map((x) => ({ motivo: x.label, cantidad: x.value }))
        }
      };
    }
    const labels = DASHBOARD_DATA.citas.confirmationSplit.map((x) => x.label);
    const values = DASHBOARD_DATA.citas.confirmationSplit.map((x) => x.value);
    return {
      process,
      answer: "📈 Generé el resumen de estado de citas (confirmadas, anuladas y sin respuesta).",
      report: {
        title: "Estado de confirmación de citas",
        subtitle: "Vista ejecutiva",
        labels,
        values,
        valueLabel: "Citas",
        rows: DASHBOARD_DATA.citas.confirmationSplit.map((x) => ({ estado: x.label, cantidad: x.value }))
      }
    };
  }

  if (process === "preadmision") {
    if (q.includes("genero")) {
      const labels = DASHBOARD_DATA.preadmision.byGender.map((x) => x.label);
      const values = DASHBOARD_DATA.preadmision.byGender.map((x) => x.value);
      return {
        process,
        answer: "🧑‍⚕️ Aquí tienes la distribución de pacientes por género en preadmisión.",
        report: {
          title: "Pacientes por género",
          subtitle: "Preadmisión",
          labels,
          values,
          valueLabel: "Pacientes",
          rows: DASHBOARD_DATA.preadmision.byGender.map((x) => ({ genero: x.label, cantidad: x.value }))
        }
      };
    }
    if (q.includes("mes")) {
      const labels = DASHBOARD_DATA.preadmision.byMonth.map((x) => x.label);
      const values = DASHBOARD_DATA.preadmision.byMonth.map((x) => x.value);
      return {
        process,
        answer: "📅 Generé el reporte mensual de preadmisiones.",
        report: {
          title: "Preadmisiones por mes",
          subtitle: "Tendencia semestral",
          labels,
          values,
          valueLabel: "Preadmisiones",
          rows: DASHBOARD_DATA.preadmision.byMonth.map((x) => ({ mes: x.label, cantidad: x.value }))
        }
      };
    }
    const labels = DASHBOARD_DATA.preadmision.byStatus.map((x) => x.label);
    const values = DASHBOARD_DATA.preadmision.byStatus.map((x) => x.value);
    return {
      process,
      answer: "🧾 Te preparé procesos de preadmisión por estado para identificar cuellos de botella.",
      report: {
        title: "Procesos por estado",
        subtitle: "Preadmisión",
        labels,
        values,
        valueLabel: "Procesos",
        rows: DASHBOARD_DATA.preadmision.byStatus.map((x) => ({ estado: x.label, cantidad: x.value }))
      }
    };
  }

  const labels = DASHBOARD_DATA.comex.byStatus.map((x) => x.label);
  const values = DASHBOARD_DATA.comex.byStatus.map((x) => x.value);
  return {
    process,
    answer: "🌍 Aquí tienes el estado de operaciones COMEX para seguimiento operacional.",
    report: {
      title: "Operaciones COMEX por estado",
      subtitle: "Pipeline actual",
      labels,
      values,
      valueLabel: "Operaciones",
      rows: DASHBOARD_DATA.comex.byStatus.map((x) => ({ estado: x.label, cantidad: x.value }))
    }
  };
}

export function ProcessAnalyticsStudio() {
  const [process, setProcess] = useState<ProcessType>("preadmision");
  const [question, setQuestion] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      text: "👋 Soy tu analista de datos. Pregúntame y te generaré reportes accionables por proceso."
    }
  ]);
  const [report, setReport] = useState<GeneratedReport | null>(null);

  const data = DASHBOARD_DATA[process];
  const maxReportValue = useMemo(() => Math.max(1, ...(report?.values ?? [1])), [report]);

  async function submitQuestion(e: FormEvent) {
    e.preventDefault();
    const input = question.trim();
    if (!input) return;
    setLoadingQuestion(true);
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: input };
    try {
      const response = await fetch("/api/reports/sql-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input, process })
      });
      const data = (await response.json().catch(() => null)) as SqlAssistantResponse | { error?: string } | null;
      if (!response.ok || !data || "error" in data) throw new Error((data as { error?: string } | null)?.error || "No fue posible generar consulta SQL.");
      const sqlData = data as SqlAssistantResponse;

      setProcess(sqlData.process);
      setReport({
        title: sqlData.title,
        subtitle: sqlData.subtitle,
        labels: sqlData.rows.map((r) => r.label),
        values: sqlData.rows.map((r) => r.value),
        valueLabel: "registros",
        sql: sqlData.sql,
        rows: sqlData.rows.map((r) => ({ categoria: r.label, cantidad: r.value }))
      });
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: crypto.randomUUID(), role: "agent", text: `🧠 ${sqlData.insight}` }
      ]);
    } catch {
      const result = buildReport(input, process);
      setProcess(result.process);
      setReport(result.report);
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: crypto.randomUUID(), role: "agent", text: `⚠️ Usé modo demo local. ${result.answer}` }
      ]);
    } finally {
      setLoadingQuestion(false);
    }
    setQuestion("");
  }

  function downloadCsv() {
    if (!report) return;
    const csv = toCsv(report.rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${process}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const quickPrompts = useMemo(() => {
    if (process === "comex") {
      return [
        "Operaciones COMEX por estado",
        "Operaciones COMEX por mes",
        "Documentos por tipo en COMEX",
        "Top clientes en COMEX"
      ];
    }
    if (process === "citas") {
      return [
        "¿Cuántos clientes confirman y anulan en confirmación de horas?",
        "Dame motivos de anulación en citas",
        "Tendencia mensual de citas"
      ];
    }
    return [
      "Muestra preadmisiones por estado",
      "Pacientes por género en preadmisión",
      "Preadmisiones por mes",
      "Documentos por tipo en preadmisión"
    ];
  }, [process]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Analytics Hub</p>
            <h2 className="text-2xl font-semibold text-slate-900">Reportes por proceso</h2>
            <p className="text-sm text-slate-600">Selecciona el proceso y obtén métricas, gráficos y análisis conversacional.</p>
          </div>
          <div className="w-full max-w-xs">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              Proceso
            </label>
            <select
              value={process}
              onChange={(e) => setProcess(e.target.value as ProcessType)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            >
              {PROCESS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <article key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{kpi.value}</p>
          </article>
        ))}
      </section>

      {process === "preadmision" && (
        <section className="grid gap-4 xl:grid-cols-3">
          <article>
            <p className="mb-2 text-sm font-semibold text-slate-800">Procesos por estado</p>
            <Bars data={DASHBOARD_DATA.preadmision.byStatus} color="bg-emerald-500" />
          </article>
          <article>
            <p className="mb-2 text-sm font-semibold text-slate-800">Pacientes por género</p>
            <Bars data={DASHBOARD_DATA.preadmision.byGender} color="bg-violet-500" />
          </article>
          <article>
            <p className="mb-2 text-sm font-semibold text-slate-800">Preadmisiones por mes</p>
            <TrendBars data={DASHBOARD_DATA.preadmision.byMonth} />
          </article>
        </section>
      )}

      {process === "citas" && (
        <section className="grid gap-4 xl:grid-cols-3">
          <article>
            <p className="mb-2 text-sm font-semibold text-slate-800">Confirmación de citas</p>
            <Bars data={DASHBOARD_DATA.citas.confirmationSplit} color="bg-cyan-500" />
          </article>
          <article>
            <p className="mb-2 text-sm font-semibold text-slate-800">Motivo de anulación</p>
            <Bars data={DASHBOARD_DATA.citas.cancellationReasons} color="bg-rose-500" />
          </article>
          <article>
            <p className="mb-2 text-sm font-semibold text-slate-800">Tendencia semanal</p>
            <TrendBars data={DASHBOARD_DATA.citas.trend} />
          </article>
        </section>
      )}

      {process === "comex" && (
        <section className="grid gap-4 xl:grid-cols-3">
          <article>
            <p className="mb-2 text-sm font-semibold text-slate-800">Operaciones por estado</p>
            <Bars data={DASHBOARD_DATA.comex.byStatus} color="bg-blue-500" />
          </article>
          <article>
            <p className="mb-2 text-sm font-semibold text-slate-800">Distribución por moneda</p>
            <Bars data={DASHBOARD_DATA.comex.byCurrency} color="bg-amber-500" />
          </article>
          <article>
            <p className="mb-2 text-sm font-semibold text-slate-800">Operaciones por mes</p>
            <TrendBars data={DASHBOARD_DATA.comex.byMonth} />
          </article>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Bot size={16} className="text-cyan-700" />
            Chatbot analista de reportes
          </p>
          <p className="mt-1 text-xs text-slate-500">Haz preguntas en lenguaje natural y genero un reporte con visualización y tabla.</p>

          <div className="mt-3 max-h-72 space-y-2 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  m.role === "agent" ? "border border-cyan-200 bg-cyan-50 text-slate-800" : "ml-auto border border-slate-200 bg-white text-slate-900"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <form onSubmit={submitQuestion} className="mt-3 flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="bank-input"
              placeholder="Ej: muestra motivos de anulación de citas"
            />
            <button type="submit" className="bank-btn px-4">
              {loadingQuestion ? "..." : <Send size={14} />}
            </button>
          </form>

          <div className="mt-2 flex flex-wrap gap-2">
            {quickPrompts.map((p) => (
              <button
                key={p}
                type="button"
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-cyan-300 hover:bg-cyan-50"
                onClick={() => {
                  setQuestion(p);
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              <BarChart3 size={16} className="text-cyan-700" />
              Reporte generado
            </p>
            <button type="button" className="bank-btn-ghost inline-flex items-center gap-2 text-xs" onClick={downloadCsv} disabled={!report}>
              <Download size={13} />
              CSV
            </button>
          </div>

          {!report ? (
            <p className="text-sm text-slate-500">Aún no hay reporte. Pregunta al chatbot para generarlo.</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-900">{report.title}</p>
              <p className="mb-3 text-xs text-slate-500">{report.subtitle}</p>
              {report.sql ? (
                <pre className="mb-3 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
                  {report.sql}
                </pre>
              ) : null}
              <div className="space-y-2">
                {report.labels.map((label, idx) => {
                  const value = report.values[idx] ?? 0;
                  const width = Math.max(6, Math.round((value / maxReportValue) * 100));
                  return (
                    <div key={`${label}-${idx}`}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-semibold text-slate-900">
                          {value} {report.valueLabel}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100">
                        <div className="h-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </article>
      </section>
    </div>
  );
}
