"use client";

import Link from "next/link";
import { Copy, Mail, Search } from "lucide-react";
import type { OperationStatus } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { DocumentThumbnail } from "@/components/document-thumbnail";
import type { Lang } from "@/lib/i18n";
import { operationStatusClass, operationStatusLabel } from "@/lib/operation-status";

type Doc = {
  id: string;
  fileName: string;
  mimeType: string;
  thumbnailUrl: string;
  storageUrl?: string;
  extractedText: string | null;
  extractedFields: unknown;
  confidenceGlobal: number | null;
  confidenceByField: unknown;
};

type OperationDetailViewProps = {
  lang: Lang;
  operation: {
    id: string;
    clientName: string;
    clientRut: string;
    status: OperationStatus;
    requiresReview: boolean;
    reviewReason: string | null;
    validationSummary: unknown;
    validatedAt: string | null;
    createdAt: string;
    documents: Doc[];
  };
};

type TableRow = {
  key: string;
  label: string;
  value: string;
};

type DocumentComment = {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
};

type ReviewFlow = {
  documentType: string;
  requiresReview: boolean;
  flowName?: string | null;
  checklist?: unknown;
};

type ValidationFinding = {
  rule: string;
  title: string;
  level: "OK" | "WARN" | "ERROR";
  verdict?: "MATCH" | "MISMATCH" | "NOT_VERIFIABLE";
  pair?: string;
  conclusion: string;
  evidence: Array<{ documentId: string; fileName: string; value: string }>;
};

type ValidationSummary = {
  overall: "OK" | "WARN" | "ERROR";
  computedAt: string;
  findings: ValidationFinding[];
};

function setNestedValue(target: unknown, path: string, rawValue: string) {
  const clone =
    target && typeof target === "object"
      ? JSON.parse(JSON.stringify(target))
      : {};
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return clone;

  let cursor: Record<string, unknown> = clone as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    const next = cursor[key];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }

  const leaf = parts[parts.length - 1];
  const trimmed = rawValue.trim();
  if (trimmed === "") {
    cursor[leaf] = "";
    return clone;
  }

  const lower = trimmed.toLowerCase();
  if (lower === "true" || lower === "false") {
    cursor[leaf] = lower === "true";
    return clone;
  }

  if (!Number.isNaN(Number(trimmed)) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    cursor[leaf] = Number(trimmed);
    return clone;
  }

  cursor[leaf] = rawValue;
  return clone;
}

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

export function OperationDetailView({ operation, lang }: OperationDetailViewProps) {
  const t =
    lang === "en"
      ? {
          opDetail: "Operation detail",
          id: "Identification:",
          date: "Date:",
          docs: "Documents:",
          status: "Status:",
          confidence: "Confidence",
          reviewFlag: "Requires review:",
          autoValidation: "Automatic validation",
          expand: "Expand",
          collapse: "Collapse",
          lastRun: "Last run:",
          runValidation: "Run validation",
          runningValidation: "Validating...",
          noValidation: "No validation run yet.",
          evidence: "Evidence",
          aiSearch: "Search with AI (this operation)",
          reprocess: "Reprocess AI extraction",
          reprocessing: "Reprocessing...",
          email: "Send by email",
          files: "Files",
          summary: "Structured AI summary",
          searchField: "Search field or value...",
          field: "Field",
          value: "Value",
          action: "Action",
          noResults: "No results for the applied filter.",
          copy: "Copy",
          openDoc: "Open document",
          pages: "Pages:",
          calculating: "calculating...",
          notAvailable: "not available",
          noDocs: "No associated documents.",
          extractedText: "View extracted text"
        }
      : {
          opDetail: "Detalle de operación",
          id: "Identificación:",
          date: "Fecha:",
          docs: "Documentos:",
          status: "Estado:",
          confidence: "Confianza",
          reviewFlag: "Requiere revisión:",
          autoValidation: "Validación automática",
          expand: "Expandir",
          collapse: "Contraer",
          lastRun: "Última ejecución:",
          runValidation: "Ejecutar validación",
          runningValidation: "Validando...",
          noValidation: "Aún no hay validación ejecutada.",
          evidence: "Evidencia",
          aiSearch: "Buscar con IA (esta operación)",
          reprocess: "Reprocesar extracción IA",
          reprocessing: "Reprocesando...",
          email: "Enviar por email",
          files: "Archivos",
          summary: "Resumen IA estructurado",
          searchField: "Buscar campo o valor...",
          field: "Campo",
          value: "Valor",
          action: "Acción",
          noResults: "Sin resultados para el filtro aplicado.",
          copy: "Copiar",
          openDoc: "Abrir documento",
          pages: "Páginas:",
          calculating: "calculando...",
          notAvailable: "no disponible",
          noDocs: "No hay documentos asociados.",
          extractedText: "Ver texto extraído"
        };
  const [selectedId, setSelectedId] = useState(operation.documents[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [pageCountByDoc, setPageCountByDoc] = useState<Record<string, number>>({});
  const [pageCountLoading, setPageCountLoading] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessError, setReprocessError] = useState<string | null>(null);
  const [commentsByDoc, setCommentsByDoc] = useState<Record<string, DocumentComment[]>>({});
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [reviewFlows, setReviewFlows] = useState<ReviewFlow[]>([]);
  const [editableFieldsByDoc, setEditableFieldsByDoc] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(operation.documents.map((doc) => [doc.id, doc.extractedFields ?? {}]))
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [saveFieldLoading, setSaveFieldLoading] = useState(false);
  const [saveFieldError, setSaveFieldError] = useState<string | null>(null);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(
    operation.validationSummary && typeof operation.validationSummary === "object"
      ? (operation.validationSummary as ValidationSummary)
      : null
  );
  const [validatedAt, setValidatedAt] = useState<string | null>(operation.validatedAt);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);

  const selectedDoc = useMemo(
    () => operation.documents.find((doc) => doc.id === selectedId) ?? operation.documents[0],
    [operation.documents, selectedId]
  );

  const currentExtractedFields = selectedDoc ? editableFieldsByDoc[selectedDoc.id] ?? selectedDoc.extractedFields : {};
  const rows = useMemo(() => flattenObject(currentExtractedFields), [currentExtractedFields]);
  const confidenceByFieldMap = useMemo(() => {
    if (!selectedDoc?.confidenceByField || typeof selectedDoc.confidenceByField !== "object") return {} as Record<string, number>;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(selectedDoc.confidenceByField as Record<string, unknown>)) {
      const n = Number(v);
      if (!Number.isNaN(n)) out[k] = n;
    }
    return out;
  }, [selectedDoc?.confidenceByField]);

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

  useEffect(() => {
    async function loadReviewFlows() {
      try {
        const response = await fetch("/api/review-flows");
        if (!response.ok) return;
        const data = (await response.json().catch(() => null)) as { flows?: ReviewFlow[] } | null;
        setReviewFlows(data?.flows ?? []);
      } catch {
        // noop
      }
    }
    void loadReviewFlows();
  }, []);

  useEffect(() => {
    async function loadComments() {
      if (!selectedDoc) return;
      if (commentsByDoc[selectedDoc.id]) return;
      try {
        const response = await fetch(`/api/documents/${selectedDoc.id}/comments`);
        if (!response.ok) return;
        const data = (await response.json().catch(() => null)) as { comments?: DocumentComment[] } | null;
        setCommentsByDoc((prev) => ({ ...prev, [selectedDoc.id]: data?.comments ?? [] }));
      } catch {
        // noop
      }
    }
    void loadComments();
  }, [commentsByDoc, selectedDoc]);

  function normalizedDocType(doc: Doc | undefined) {
    if (!doc?.extractedFields || typeof doc.extractedFields !== "object") return null;
    const fields = doc.extractedFields as Record<string, unknown>;
    const value = String(fields.tipo_documento ?? fields.tipoDocumento ?? fields.document_type ?? "").toLowerCase().trim();
    if (!value) return null;
    if (value.includes("factura")) return "facturas";
    if (value.includes("solicitud")) return "solicitudes";
    if (value.includes("transporte") || value.includes("guia") || value.includes("guía")) return "transporte";
    return "otros";
  }

  const selectedDocType = normalizedDocType(selectedDoc);
  const selectedReviewFlow = reviewFlows.find((f) => f.documentType === selectedDocType);

  async function addComment() {
    if (!selectedDoc || commentLoading) return;
    const text = commentText.trim();
    if (!text) return;
    setCommentLoading(true);
    setCommentError(null);
    try {
      const response = await fetch(`/api/documents/${selectedDoc.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = (await response.json().catch(() => null)) as { comment?: DocumentComment; error?: string } | null;
      if (!response.ok || !data?.comment) {
        setCommentError(data?.error ?? "No fue posible guardar el comentario.");
        setCommentLoading(false);
        return;
      }
      setCommentsByDoc((prev) => ({
        ...prev,
        [selectedDoc.id]: [data.comment as DocumentComment, ...(prev[selectedDoc.id] ?? [])]
      }));
      setCommentText("");
    } catch {
      setCommentError("No fue posible guardar el comentario.");
    } finally {
      setCommentLoading(false);
    }
  }

  async function saveEditedField(row: TableRow) {
    if (!selectedDoc || saveFieldLoading) return;
    setSaveFieldLoading(true);
    setSaveFieldError(null);

    const current = editableFieldsByDoc[selectedDoc.id] ?? selectedDoc.extractedFields ?? {};
    const nextFields = setNestedValue(current, row.key, editingValue);
    try {
      const response = await fetch(`/api/documents/${selectedDoc.id}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedFields: nextFields })
      });
      const data = (await response.json().catch(() => null)) as { extractedFields?: unknown; error?: string } | null;
      if (!response.ok) {
        setSaveFieldError(data?.error ?? "No fue posible guardar el campo.");
        setSaveFieldLoading(false);
        return;
      }
      setEditableFieldsByDoc((prev) => ({
        ...prev,
        [selectedDoc.id]: data?.extractedFields ?? nextFields
      }));
      setEditingKey(null);
      setEditingValue("");
    } catch {
      setSaveFieldError("No fue posible guardar el campo.");
    } finally {
      setSaveFieldLoading(false);
    }
  }

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

  async function runValidation() {
    if (validating) return;
    setValidating(true);
    setValidationError(null);
    try {
      const response = await fetch(`/api/operations/${operation.id}/validation`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as
        | { validationSummary?: ValidationSummary; validatedAt?: string | null; error?: string }
        | null;
      if (!response.ok || !data?.validationSummary) {
        setValidationError(data?.error ?? "No fue posible ejecutar validación.");
        setValidating(false);
        return;
      }
      setValidationSummary(data.validationSummary);
      setValidatedAt(data.validatedAt ?? null);
    } catch {
      setValidationError("No fue posible ejecutar validación.");
    } finally {
      setValidating(false);
    }
  }

  function validationBadgeClass(level: "OK" | "WARN" | "ERROR") {
    if (level === "OK") return "border-emerald-300 bg-emerald-50 text-emerald-800";
    if (level === "WARN") return "border-amber-300 bg-amber-50 text-amber-800";
    return "border-rose-300 bg-rose-50 text-rose-800";
  }

  return (
    <section className="space-y-6">
      <article className="bank-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t.opDetail}</p>
        <h2 className="mt-1 font-display text-3xl text-navy">{operation.clientName}</h2>
        <div className="mt-4 grid gap-2 text-xs md:grid-cols-3">
          <p className="rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold">{t.id}</span> {operation.clientRut}
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold">{t.date}</span> {new Date(operation.createdAt).toLocaleString("es-CL")}
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold">{t.docs}</span> {operation.documents.length}
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold">{t.status}</span>{" "}
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${operationStatusClass(operation.status)}`}>
              {operationStatusLabel(operation.status, lang)}
            </span>
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold">{t.reviewFlag}</span>{" "}
            {operation.requiresReview ? (lang === "en" ? "Yes" : "Sí") : (lang === "en" ? "No" : "No")}
          </p>
        </div>
        {operation.requiresReview && operation.reviewReason && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {operation.reviewReason}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={`/busqueda?operationId=${operation.id}&returnTo=${encodeURIComponent(`/operaciones/${operation.id}`)}`}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
          >
            <Search size={13} />
            {t.aiSearch}
          </Link>
          <button
            type="button"
            className="inline-flex items-center rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-60"
            onClick={reprocessOperation}
            disabled={reprocessing}
          >
            {reprocessing ? t.reprocessing : t.reprocess}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={sendByEmail}
          >
            <Mail size={13} />
            {t.email}
          </button>
          {reprocessError && <span className="text-xs text-rose-700">{reprocessError}</span>}
        </div>
      </article>

      <article className="bank-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t.autoValidation}</p>
            {validatedAt && <p className="mt-1 text-xs text-slate-500">{t.lastRun} {new Date(validatedAt).toLocaleString("es-CL")}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setValidationOpen((prev) => !prev)}
            >
              {validationOpen ? t.collapse : t.expand}
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-lg border border-cyan-300 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-60"
              onClick={() => void runValidation()}
              disabled={validating}
            >
              {validating ? t.runningValidation : t.runValidation}
            </button>
          </div>
        </div>

        {validationOpen && (
          <>
            {validationError && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{validationError}</p>}

            {!validationSummary ? (
              <p className="mt-3 text-sm text-slate-600">{t.noValidation}</p>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${validationBadgeClass(validationSummary.overall)}`}>
                    {validationSummary.overall}
                  </span>
                </div>
                {validationSummary.findings.map((finding, idx) => (
                  <div key={`${finding.rule}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{finding.title}</p>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${validationBadgeClass(finding.level)}`}>
                        {finding.level}
                      </span>
                      {finding.verdict && (
                        <span className="inline-flex rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {finding.verdict}
                        </span>
                      )}
                    </div>
                    {finding.pair && <p className="mt-1 text-[11px] text-slate-500">Comparación: {finding.pair}</p>}
                    <p className="mt-1 text-xs text-slate-700">{finding.conclusion}</p>
                    {finding.evidence.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{t.evidence}</p>
                        <ul className="mt-1 space-y-1 text-xs text-slate-600">
                          {finding.evidence.slice(0, 4).map((ev, evIdx) => (
                            <li key={`${ev.documentId}-${evIdx}`}>
                              {ev.fileName}: {ev.value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </article>

      <article className="bank-card grid gap-0 overflow-hidden md:grid-cols-[300px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50 md:border-b-0 md:border-r">
          <div className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t.files}</div>
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
            <p className="text-sm text-slate-500">{t.noDocs}</p>
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
                      {t.openDoc}
                    </a>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t.summary}</p>
                    <label className="relative block w-full max-w-xs">
                      <Search size={14} className="pointer-events-none absolute left-2 top-2.5 text-slate-400" />
                      <input
                        className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-2 text-xs"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t.searchField}
                      />
                    </label>
                  </div>

                  <div className="max-h-[360px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-white text-slate-500">
                          <th className="px-3 py-2 text-left font-semibold">{t.field}</th>
                          <th className="px-3 py-2 text-left font-semibold">{t.value}</th>
                          <th className="px-3 py-2 text-left font-semibold">{t.action}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 && (
                          <tr>
                            <td className="px-3 py-2 text-slate-500" colSpan={3}>
                              {t.noResults}
                            </td>
                          </tr>
                        )}
                        {filteredRows.map((row) => (
                          <tr key={`${row.key}-${row.value}`} className="border-b border-slate-100 align-top">
                            <td className="px-3 py-2 font-medium text-slate-700">{row.label}</td>
                            <td className="px-3 py-2 text-slate-700">
                              {editingKey === row.key ? (
                                <input
                                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                />
                              ) : isDocumentTypeField(row) ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                                    {row.value}
                                  </span>
                                  {confidenceByFieldMap[row.key] !== undefined && (
                                    <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                      {t.confidence} {Math.round(confidenceByFieldMap[row.key] * 100)}%
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  <span>{row.value}</span>
                                  {confidenceByFieldMap[row.key] !== undefined && (
                                    <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                      {t.confidence} {Math.round(confidenceByFieldMap[row.key] * 100)}%
                                    </span>
                                  )}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                <button
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                  onClick={() => copyValue(row.value)}
                                >
                                  <Copy size={12} /> {t.copy}
                                </button>
                                {editingKey === row.key ? (
                                  <>
                                    <button
                                      className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                                      onClick={() => void saveEditedField(row)}
                                      disabled={saveFieldLoading}
                                    >
                                      {saveFieldLoading ? "Guardando..." : "Guardar"}
                                    </button>
                                    <button
                                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                      onClick={() => {
                                        setEditingKey(null);
                                        setEditingValue("");
                                      }}
                                      disabled={saveFieldLoading}
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-100"
                                    onClick={() => {
                                      setEditingKey(row.key);
                                      setEditingValue(row.value === "-" ? "" : row.value);
                                      setSaveFieldError(null);
                                    }}
                                  >
                                    Editar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {saveFieldError && <p className="px-3 py-2 text-xs text-rose-700">{saveFieldError}</p>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <span className="font-semibold">{t.pages}</span>{" "}
                {selectedDoc
                  ? pageCountLoading && pageCountByDoc[selectedDoc.id] === undefined
                    ? t.calculating
                    : (pageCountByDoc[selectedDoc.id] ?? 0) > 0
                      ? pageCountByDoc[selectedDoc.id]
                      : t.notAvailable
                  : t.notAvailable}
                {selectedDoc?.confidenceGlobal !== null && selectedDoc?.confidenceGlobal !== undefined && (
                  <span className="ml-3">
                    <span className="font-semibold">{t.confidence}</span> {Math.round(selectedDoc.confidenceGlobal * 100)}%
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p className="font-semibold">Flujo de revisión</p>
                {selectedReviewFlow?.requiresReview ? (
                  <p className="mt-1">
                    Este tipo documental requiere revisión
                    {selectedReviewFlow.flowName ? `: ${selectedReviewFlow.flowName}` : ""}.
                  </p>
                ) : (
                  <p className="mt-1">Sin revisión obligatoria configurada para este tipo documental.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Comentarios del documento</p>
                </div>
                <div className="mt-2 flex gap-2">
                  <textarea
                    className="min-h-20 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-cyan-500"
                    placeholder="Añadir comentario de revisión..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="h-fit rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
                    onClick={() => void addComment()}
                    disabled={commentLoading}
                  >
                    {commentLoading ? "Guardando..." : "Guardar comentario"}
                  </button>
                </div>
                {commentError && <p className="mt-2 text-xs text-rose-700">{commentError}</p>}
                <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
                  {(selectedDoc ? commentsByDoc[selectedDoc.id] ?? [] : []).length === 0 && (
                    <p className="text-xs text-slate-500">Sin comentarios todavía.</p>
                  )}
                  {(selectedDoc ? commentsByDoc[selectedDoc.id] ?? [] : []).map((comment) => (
                    <div key={comment.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <p className="font-semibold text-slate-700">{comment.authorName}</p>
                      <p className="mt-1 whitespace-pre-wrap text-slate-700">{comment.text}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{new Date(comment.createdAt).toLocaleString("es-CL")}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDoc.extractedText && (
                <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <summary className="cursor-pointer font-semibold text-slate-700">{t.extractedText}</summary>
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
