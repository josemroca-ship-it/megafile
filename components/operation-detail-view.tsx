"use client";

import Link from "next/link";
import { Copy, Mail, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DocumentThumbnail } from "@/components/document-thumbnail";

type Doc = {
  id: string;
  fileName: string;
  mimeType: string;
  thumbnailUrl: string;
  storageUrl?: string;
  extractedText: string | null;
  extractedFields: unknown;
};

type OperationDetailViewProps = {
  operation: {
    id: string;
    clientName: string;
    clientRut: string;
    createdAt: string;
    documents: Doc[];
  };
};

type TableRow = {
  key: string;
  label: string;
  value: string;
};

function isDocumentTypeField(row: TableRow) {
  const label = `${row.key} ${row.label}`.toLowerCase();
  return (
    (label.includes("tipo_documento") ||
      label.includes("tipo documento") ||
      label.includes("tipo documental")) &&
    row.value.trim() !== "-" &&
    row.value.trim() !== ""
  );
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatLabel(path: string) {
  return path
    .split(".")
    .map((segment) => segment.replace(/[_-]+/g, " ").trim())
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" / ");
}

function flattenObject(input: unknown, prefix = ""): TableRow[] {
  if (!input || typeof input !== "object") {
    return prefix ? [{ key: prefix, label: formatLabel(prefix), value: stringifyValue(input) }] : [];
  }

  if (Array.isArray(input)) {
    if (!prefix) return [{ key: "lista", label: "Lista", value: stringifyValue(input) }];
    return [{ key: prefix, label: formatLabel(prefix), value: stringifyValue(input) }];
  }

  const obj = input as Record<string, unknown>;
  const rows: TableRow[] = [];

  for (const [k, v] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      rows.push(...flattenObject(v, nextKey));
    } else {
      rows.push({ key: nextKey, label: formatLabel(nextKey), value: stringifyValue(v) });
    }
  }

  return rows;
}

export function OperationDetailView({ operation }: OperationDetailViewProps) {
  const [selectedId, setSelectedId] = useState(operation.documents[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [pageCountByDoc, setPageCountByDoc] = useState<Record<string, number>>({});
  const [pageCountLoading, setPageCountLoading] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessError, setReprocessError] = useState<string | null>(null);

  const selectedDoc = useMemo(
    () => operation.documents.find((doc) => doc.id === selectedId) ?? operation.documents[0],
    [operation.documents, selectedId]
  );

  const rows = useMemo(() => flattenObject(selectedDoc?.extractedFields), [selectedDoc?.extractedFields]);

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) => row.label.toLowerCase().includes(q) || row.value.toLowerCase().includes(q));
  }, [rows, query]);

  useEffect(() => {
    async function resolvePageCount() {
      if (!selectedDoc) return;
      if (pageCountByDoc[selectedDoc.id] !== undefined) return;

      if (selectedDoc.mimeType.startsWith("image/")) {
        setPageCountByDoc((prev) => ({ ...prev, [selectedDoc.id]: 1 }));
        return;
      }

      if (selectedDoc.mimeType !== "application/pdf") {
        setPageCountByDoc((prev) => ({ ...prev, [selectedDoc.id]: 0 }));
        return;
      }

      setPageCountLoading(true);
      try {
        const response = await fetch(`/api/documents/${selectedDoc.id}`);
        if (!response.ok) {
          setPageCountByDoc((prev) => ({ ...prev, [selectedDoc.id]: 0 }));
          setPageCountLoading(false);
          return;
        }

        const bytes = new Uint8Array(await response.arrayBuffer());
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
        }
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        const pages = Number(doc?.numPages ?? 0);
        setPageCountByDoc((prev) => ({ ...prev, [selectedDoc.id]: pages }));
      } catch {
        setPageCountByDoc((prev) => ({ ...prev, [selectedDoc.id]: 0 }));
      } finally {
        setPageCountLoading(false);
      }
    }

    void resolvePageCount();
  }, [pageCountByDoc, selectedDoc]);

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      alert("No fue posible copiar el valor.");
    }
  }

  async function reprocessOperation() {
    if (reprocessing) return;
    setReprocessError(null);
    setReprocessing(true);
    try {
      const response = await fetch("/api/operations/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationId: operation.id })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setReprocessError(data?.error ?? "No fue posible reprocesar la operación.");
        setReprocessing(false);
        return;
      }

      window.location.reload();
    } catch {
      setReprocessError("No fue posible reprocesar la operación.");
      setReprocessing(false);
    }
  }

  function sendByEmail() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const subject = `Documentos operación - ${operation.clientName} (${operation.clientRut})`;
    const bodyLines = [
      "Hola,",
      "",
      "Comparto los documentos asociados a la operación:",
      `Cliente: ${operation.clientName}`,
      `Identificación: ${operation.clientRut}`,
      `Fecha: ${new Date(operation.createdAt).toLocaleString("es-CL")}`,
      "",
      "Documentos:"
    ];

    for (const doc of operation.documents) {
      bodyLines.push(`- ${doc.fileName}: ${origin}/api/documents/${doc.id}`);
    }

    bodyLines.push("", "Enviado desde Megafy IA.");
    const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    window.location.href = href;
  }

  return (
    <section className="space-y-6">
      <article className="bank-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Detalle de operación</p>
        <h2 className="mt-1 font-display text-3xl text-navy">{operation.clientName}</h2>
        <div className="mt-4 grid gap-2 text-xs md:grid-cols-3">
          <p className="rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold">Identificación:</span> {operation.clientRut}
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold">Fecha:</span> {new Date(operation.createdAt).toLocaleString("es-CL")}
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold">Documentos:</span> {operation.documents.length}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={`/busqueda?operationId=${operation.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
          >
            <Search size={13} />
            Buscar con IA (esta operación)
          </Link>
          <button
            type="button"
            className="inline-flex items-center rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-60"
            onClick={reprocessOperation}
            disabled={reprocessing}
          >
            {reprocessing ? "Reprocesando..." : "Reprocesar extracción IA"}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={sendByEmail}
          >
            <Mail size={13} />
            Enviar por email
          </button>
          {reprocessError && <span className="text-xs text-rose-700">{reprocessError}</span>}
        </div>
      </article>

      <article className="bank-card grid gap-0 overflow-hidden md:grid-cols-[300px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50 md:border-b-0 md:border-r">
          <div className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Archivos</div>
          <div className="max-h-[640px] overflow-auto p-2">
            {operation.documents.map((doc) => {
              const active = selectedDoc?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  className={`mb-2 w-full rounded-lg border px-3 py-3 text-left text-xs transition ${
                    active
                      ? "border-cyan-300 bg-cyan-50 text-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  onClick={() => setSelectedId(doc.id)}
                >
                  <p className="truncate font-semibold">{doc.fileName}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{doc.mimeType || "Documento"}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="p-4 md:p-5">
          {!selectedDoc ? (
            <p className="text-sm text-slate-500">No hay documentos asociados.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <div className="relative h-56 w-full">
                    <DocumentThumbnail
                      documentId={selectedDoc.id}
                      mimeType={selectedDoc.mimeType}
                      fallbackSrc={selectedDoc.thumbnailUrl}
                      alt={selectedDoc.fileName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="border-t border-slate-200 bg-white p-3">
                    <a
                      className="text-xs font-semibold text-navy underline"
                      href={`/api/documents/${selectedDoc.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir documento
                    </a>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Resumen IA estructurado</p>
                    <label className="relative block w-full max-w-xs">
                      <Search size={14} className="pointer-events-none absolute left-2 top-2.5 text-slate-400" />
                      <input
                        className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-2 text-xs"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar campo o valor..."
                      />
                    </label>
                  </div>

                  <div className="max-h-[360px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-white text-slate-500">
                          <th className="px-3 py-2 text-left font-semibold">Campo</th>
                          <th className="px-3 py-2 text-left font-semibold">Valor</th>
                          <th className="px-3 py-2 text-left font-semibold">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 && (
                          <tr>
                            <td className="px-3 py-2 text-slate-500" colSpan={3}>
                              Sin resultados para el filtro aplicado.
                            </td>
                          </tr>
                        )}
                        {filteredRows.map((row) => (
                          <tr key={`${row.key}-${row.value}`} className="border-b border-slate-100 align-top">
                            <td className="px-3 py-2 font-medium text-slate-700">{row.label}</td>
                            <td className="px-3 py-2 text-slate-700">
                              {isDocumentTypeField(row) ? (
                                <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                                  {row.value}
                                </span>
                              ) : (
                                row.value
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                onClick={() => copyValue(row.value)}
                              >
                                <Copy size={12} /> Copiar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <span className="font-semibold">Páginas:</span>{" "}
                {selectedDoc
                  ? pageCountLoading && pageCountByDoc[selectedDoc.id] === undefined
                    ? "calculando..."
                    : (pageCountByDoc[selectedDoc.id] ?? 0) > 0
                      ? pageCountByDoc[selectedDoc.id]
                      : "no disponible"
                  : "no disponible"}
              </div>

              {selectedDoc.extractedText && (
                <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <summary className="cursor-pointer font-semibold text-slate-700">Ver texto extraído</summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-slate-600">
                    {selectedDoc.extractedText}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
