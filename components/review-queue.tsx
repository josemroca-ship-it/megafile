"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OperationStatus } from "@prisma/client";
import { OPERATION_STATUS_ORDER, operationStatusClass, operationStatusLabel } from "@/lib/operation-status";
import type { Lang } from "@/lib/i18n";

type QueueItem = {
  id: string;
  clientName: string;
  clientRut: string;
  createdAt: string;
  status: OperationStatus;
  documentsCount: number;
  companyName: string | null;
};

export function ReviewQueue({ items, lang }: { items: QueueItem[]; lang: Lang }) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(id: string, status: OperationStatus) {
    setSavingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/operations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "No fue posible actualizar estado");
        setSavingId(null);
        return;
      }
      router.refresh();
    } catch {
      setError("No fue posible actualizar estado");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <article className="bank-card overflow-hidden p-6">
      {error && <p className="mb-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
              <th className="pb-2">{lang === "en" ? "Client" : "Cliente"}</th>
              <th className="pb-2">{lang === "en" ? "Identification" : "Identificación"}</th>
              <th className="pb-2">{lang === "en" ? "Company" : "Empresa"}</th>
              <th className="pb-2">{lang === "en" ? "Date" : "Fecha"}</th>
              <th className="pb-2">{lang === "en" ? "Documents" : "Documentos"}</th>
              <th className="pb-2">{lang === "en" ? "Current status" : "Estado actual"}</th>
              <th className="pb-2">{lang === "en" ? "Change status" : "Cambiar estado"}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-3 font-semibold text-slate-800">{item.clientName}</td>
                <td className="py-3 text-slate-700">{item.clientRut}</td>
                <td className="py-3 text-slate-700">{item.companyName ?? (lang === "en" ? "No company" : "Sin empresa")}</td>
                <td className="py-3 text-slate-600">{new Date(item.createdAt).toLocaleString("es-CL")}</td>
                <td className="py-3 text-slate-700">{item.documentsCount}</td>
                <td className="py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${operationStatusClass(item.status)}`}>
                    {operationStatusLabel(item.status, lang)}
                  </span>
                </td>
                <td className="py-3">
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                    value={item.status}
                    onChange={(e) => void updateStatus(item.id, e.target.value as OperationStatus)}
                    disabled={savingId === item.id}
                  >
                    {OPERATION_STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {operationStatusLabel(status, lang)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="py-4 text-slate-500" colSpan={7}>
                  {lang === "en" ? "No operations for selected filters." : "No hay operaciones para los filtros seleccionados."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

