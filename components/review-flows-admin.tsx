"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

type FlowRow = {
  documentType: "facturas" | "solicitudes" | "transporte" | "otros";
  requiresReview: boolean;
  flowName?: string | null;
  checklist?: unknown;
};

const DOC_TYPES: Array<{ key: FlowRow["documentType"]; labelEs: string; labelEn: string }> = [
  { key: "facturas", labelEs: "Facturas", labelEn: "Invoices" },
  { key: "solicitudes", labelEs: "Solicitudes", labelEn: "Requests" },
  { key: "transporte", labelEs: "Doc. de transporte", labelEn: "Transport docs" },
  { key: "otros", labelEs: "Otros", labelEn: "Other" }
];

export function ReviewFlowsAdmin({ lang }: { lang: Lang }) {
  const t =
    lang === "en"
      ? {
          title: "Review flows after capture",
          subtitle: "Define whether each document type must go through a review flow and assign a flow name/checklist.",
          required: "Requires review",
          flowName: "Flow name",
          checklist: "Checklist (one line per step)",
          save: "Save flows",
          saving: "Saving...",
          saved: "Flows updated",
          error: "Unable to save flows."
        }
      : {
          title: "Flujos de revisión post-captura",
          subtitle: "Define si cada tipo documental debe pasar por revisión y asigna nombre/checklist del flujo.",
          required: "Requiere revisión",
          flowName: "Nombre del flujo",
          checklist: "Checklist (una línea por paso)",
          save: "Guardar flujos",
          saving: "Guardando...",
          saved: "Flujos actualizados",
          error: "No fue posible guardar los flujos."
        };

  const [rows, setRows] = useState<FlowRow[]>(
    DOC_TYPES.map((doc) => ({ documentType: doc.key, requiresReview: false, flowName: "", checklist: [] }))
  );
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/review-flows");
        if (!response.ok) return;
        const data = (await response.json().catch(() => null)) as { flows?: FlowRow[] } | null;
        const map = new Map((data?.flows ?? []).map((f) => [f.documentType, f]));
        setRows(
          DOC_TYPES.map((doc) => {
            const current = map.get(doc.key);
            return {
              documentType: doc.key,
              requiresReview: current?.requiresReview ?? false,
              flowName: current?.flowName ?? "",
              checklist: current?.checklist ?? []
            };
          })
        );
      } catch {
        // noop
      }
    }
    void load();
  }, []);

  function docLabel(type: FlowRow["documentType"]) {
    const found = DOC_TYPES.find((d) => d.key === type);
    if (!found) return type;
    return lang === "en" ? found.labelEn : found.labelEs;
  }

  function checklistToText(value: unknown) {
    if (!Array.isArray(value)) return "";
    return value.map((v) => String(v)).join("\n");
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setError(null);

    const payload = {
      flows: rows.map((r) => ({
        documentType: r.documentType,
        requiresReview: r.requiresReview,
        flowName: r.flowName?.trim() || null,
        checklist: checklistToText(r.checklist)
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      }))
    };

    const response = await fetch("/api/review-flows", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setError(t.error);
      setLoading(false);
      return;
    }

    setMsg(t.saved);
    setLoading(false);
  }

  return (
    <article className="bank-card p-6">
      <h3 className="text-sm font-semibold text-slate-900">{t.title}</h3>
      <p className="mt-1 text-xs text-slate-600">{t.subtitle}</p>

      <form className="mt-4 space-y-3" onSubmit={onSave}>
        {rows.map((row, idx) => (
          <div key={row.documentType} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-800">{docLabel(row.documentType)}</p>
            <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={row.requiresReview}
                onChange={(e) =>
                  setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, requiresReview: e.target.checked } : r)))
                }
              />
              {t.required}
            </label>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                placeholder={t.flowName}
                value={row.flowName ?? ""}
                onChange={(e) =>
                  setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, flowName: e.target.value } : r)))
                }
              />
              <textarea
                className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-xs"
                placeholder={t.checklist}
                value={checklistToText(row.checklist)}
                onChange={(e) =>
                  setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, checklist: e.target.value.split("\n") } : r)))
                }
              />
            </div>
          </div>
        ))}

        <button className="bank-btn" type="submit" disabled={loading}>
          {loading ? t.saving : t.save}
        </button>
      </form>

      {error && <p className="mt-3 text-xs text-rose-700">{error}</p>}
      {msg && <p className="mt-3 text-xs text-emerald-700">{msg}</p>}
    </article>
  );
}
