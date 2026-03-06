"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

export function ReviewThresholdAdmin({ lang }: { lang: Lang }) {
  const t =
    lang === "en"
      ? {
          title: "Automatic review threshold",
          subtitle: "If confidence is below this threshold, the operation goes to validation queue.",
          current: "Threshold",
          save: "Save threshold",
          saving: "Saving...",
          saved: "Threshold updated",
          error: "Unable to save threshold"
        }
      : {
          title: "Umbral de revisión automática",
          subtitle: "Si la confianza cae bajo este umbral, la operación pasa a la bandeja de validación.",
          current: "Umbral",
          save: "Guardar umbral",
          saving: "Guardando...",
          saved: "Umbral actualizado",
          error: "No fue posible guardar umbral"
        };

  const [threshold, setThreshold] = useState("0.78");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/settings/review-threshold");
        if (!response.ok) return;
        const data = (await response.json().catch(() => null)) as { threshold?: number } | null;
        if (typeof data?.threshold === "number") {
          setThreshold(data.threshold.toFixed(2));
        }
      } catch {
        // noop
      }
    }
    void load();
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    const numeric = Number(threshold);
    if (Number.isNaN(numeric) || numeric < 0 || numeric > 1) {
      setError(lang === "en" ? "Value must be between 0 and 1." : "El valor debe estar entre 0 y 1.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/settings/review-threshold", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threshold: numeric })
    });
    const data = (await response.json().catch(() => null)) as { threshold?: number; error?: string } | null;
    if (!response.ok || typeof data?.threshold !== "number") {
      setError(data?.error ?? t.error);
      setLoading(false);
      return;
    }
    setThreshold(data.threshold.toFixed(2));
    setMsg(t.saved);
    setLoading(false);
  }

  return (
    <article className="bank-card p-6">
      <h3 className="text-sm font-semibold text-slate-900">{t.title}</h3>
      <p className="mt-1 text-xs text-slate-600">{t.subtitle}</p>

      <form className="mt-4 flex flex-wrap items-center gap-3" onSubmit={onSave}>
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t.current}</label>
        <input
          className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
        <button className="bank-btn" type="submit" disabled={loading}>
          {loading ? t.saving : t.save}
        </button>
      </form>

      {error && <p className="mt-3 text-xs text-rose-700">{error}</p>}
      {msg && <p className="mt-3 text-xs text-emerald-700">{msg}</p>}
    </article>
  );
}

