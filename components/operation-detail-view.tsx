"use client";

import Link from "next/link";
import { Copy, Mail, Search } from "lucide-react";
import type { OperationStatus } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { DocumentThumbnail } from "@/components/document-thumbnail";
import type { Lang } from "@/lib/i18n";
import { operationStatusClass, operationStatusLabel } from "@/lib/operation-status";
import { redactPiiText } from "@/lib/pii";

type Doc = {
  id: string;
  fileName: string;
  mimeType: string;
  thumbnailUrl: string;
  storageUrl?: string;
  extractedText: string | null;
  extractedFields: unknown;
  hasPii: boolean;
  piiDetections: unknown;
  hasSignature: boolean;
  signatureHints: unknown;
  confidenceGlobal: number | null;
  confidenceByField: unknown;
};

type OperationDetailViewProps = {
  lang: Lang;
  operation: {
    id: string;
    clientName: string;
    clientRut: string;
    companyId: string | null;
    companyName: string | null;
    canEditCompany: boolean;
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

type CompanyOption = {
  id: string;
  name: string;
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
  const locale = lang === "en" ? "en-US" : "es-CL";
  const t =
    lang === "en"
      ? {
          opDetail: "Operation detail",
          id: "Identification:",
          date: "Date:",
          docs: "Documents:",
          status: "Status:",
          company: "Company:",
          changeCompany: "Change company",
          savingCompany: "Saving...",
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
          extractedText: "View extracted text",
          selectOption: "Select...",
          comparison: "Comparison:",
          saving: "Saving...",
          save: "Save",
          cancel: "Cancel",
          edit: "Edit",
          reviewFlowTitle: "Review flow",
          reviewRequired: "This document type requires review",
          reviewNotRequired: "No mandatory review configured for this document type.",
          documentComments: "Document comments",
          addReviewComment: "Add review comment...",
          saveComment: "Save comment",
          noComments: "No comments yet.",
          genericDocument: "Document",
          cannotSaveComment: "Could not save comment.",
          cannotSaveField: "Could not save the field.",
          cannotCopy: "Could not copy the value.",
          cannotReprocess: "Could not reprocess the operation.",
          cannotRunValidation: "Could not run validation.",
          cannotUpdateCompany: "Could not update company.",
          cannotSendEmail: "Could not open email client.",
          piiDetected: "PII detected",
          noPii: "No PII detected",
          signatureDetected: "Signature signal detected",
          noSignature: "No signature signal",
          hidePii: "Hide PII",
          showPii: "Show PII",
          piiSummary: "PII summary",
          signatureHints: "Signature hints"
        }
      : {
          opDetail: "Detalle de operación",
          id: "Identificación:",
          date: "Fecha:",
          docs: "Documentos:",
          status: "Estado:",
          company: "Empresa:",
          changeCompany: "Cambiar empresa",
          savingCompany: "Guardando...",
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
          extractedText: "Ver texto extraído",
          selectOption: "Seleccionar...",
          comparison: "Comparación:",
          saving: "Guardando...",
          save: "Guardar",
          cancel: "Cancelar",
          edit: "Editar",
          reviewFlowTitle: "Flujo de revisión",
          reviewRequired: "Este tipo documental requiere revisión",
          reviewNotRequired: "Sin revisión obligatoria configurada para este tipo documental.",
          documentComments: "Comentarios del documento",
          addReviewComment: "Añadir comentario de revisión...",
          saveComment: "Guardar comentario",
          noComments: "Sin comentarios todavía.",
          genericDocument: "Documento",
          cannotSaveComment: "No fue posible guardar el comentario.",
          cannotSaveField: "No fue posible guardar el campo.",
          cannotCopy: "No fue posible copiar el valor.",
          cannotReprocess: "No fue posible reprocesar la operación.",
          cannotRunValidation: "No fue posible ejecutar validación.",
          cannotUpdateCompany: "No fue posible actualizar empresa.",
          cannotSendEmail: "No fue posible abrir el cliente de correo.",
          piiDetected: "PII detectada",
          noPii: "Sin PII detectada",
          signatureDetected: "Firma detectada (señal)",
          noSignature: "Sin señal de firma",
          hidePii: "Ocultar PII",
          showPii: "Mostrar PII",
          piiSummary: "Resumen PII",
          signatureHints: "Pistas de firma"
        };
  const [selectedId, setSelectedId] = useState(operation.documents[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [pageCountByDoc, setPageCountByDoc] = useState<Record<string, number>>({});
  const [pageCountLoading, setPageCountLoading] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessError, setReprocessError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState(operation.companyId ?? "");
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
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
  const [showPii, setShowPii] = useState(false);

  const selectedDoc = useMemo(
    () => operation.documents.find((doc) => doc.id === selectedId) ?? operation.documents[0],
    [operation.documents, selectedId]
  );

  const currentExtractedFields = selectedDoc ? editableFieldsByDoc[selectedDoc.id] ?? selectedDoc.extractedFields : {};
  const rows = useMemo(() => flattenObject(currentExtractedFields), [currentExtractedFields]);
  const piiDetections = useMemo(() => {
    if (!selectedDoc?.piiDetections || !Array.isArray(selectedDoc.piiDetections)) return [] as Array<{ type: string; count: number }>;
    return (selectedDoc.piiDetections as Array<{ type?: unknown; count?: unknown }>)
      .map((item) => ({ type: String(item.type ?? "pii"), count: Number(item.count ?? 0) }))
      .filter((item) => item.count > 0);
  }, [selectedDoc?.piiDetections]);
  const signatureHints = useMemo(() => {
    if (!selectedDoc?.signatureHints || !Array.isArray(selectedDoc.signatureHints)) return [] as string[];
    return (selectedDoc.signatureHints as unknown[]).map((item) => String(item));
  }, [selectedDoc?.signatureHints]);

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
    async function loadCompanies() {
      if (!operation.canEditCompany) return;
      try {
        const response = await fetch("/api/companies");
        const data = (await response.json().catch(() => null)) as { companies?: CompanyOption[] } | null;
        if (!response.ok || !data?.companies) return;
        setCompanies(data.companies);
      } catch {
        // noop
      }
    }
    void loadCompanies();
  }, [operation.canEditCompany]);

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
        setCommentError(data?.error ?? t.cannotSaveComment);
        setCommentLoading(false);
        return;
      }
      setCommentsByDoc((prev) => ({
        ...prev,
        [selectedDoc.id]: [data.comment as DocumentComment, ...(prev[selectedDoc.id] ?? [])]
      }));
      setCommentText("");
    } catch {
      setCommentError(t.cannotSaveComment);
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
        setSaveFieldError(data?.error ?? t.cannotSaveField);
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
      setSaveFieldError(t.cannotSaveField);
    } finally {
      setSaveFieldLoading(false);
    }
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      alert(t.cannotCopy);
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
        setReprocessError(data?.error ?? t.cannotReprocess);
        setReprocessing(false);
        return;
      }

      window.location.reload();
    } catch {
      setReprocessError(t.cannotReprocess);
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
      `Fecha: ${new Date(operation.createdAt).toLocaleString(locale)}`,
      "",
      "Documentos:"
    ];

    for (const doc of operation.documents) {
      bodyLines.push(`- ${doc.fileName}: ${origin}/api/documents/${doc.id}`);
    }

    bodyLines.push("", "Enviado desde Megafy IA.");
    const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    try {
      window.location.href = href;
    } catch {
      alert(t.cannotSendEmail);
    }
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
        setValidationError(data?.error ?? t.cannotRunValidation);
        setValidating(false);
        return;
      }
      setValidationSummary(data.validationSummary);
      setValidatedAt(data.validatedAt ?? null);
    } catch {
      setValidationError(t.cannotRunValidation);
    } finally {
      setValidating(false);
    }
  }

  async function changeCompany() {
    if (!operation.canEditCompany || !companyId || savingCompany) return;
    setCompanyError(null);
    setSavingCompany(true);
    try {
      const response = await fetch(`/api/operations/${operation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId })
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setCompanyError(data?.error ?? t.cannotUpdateCompany);
        setSavingCompany(false);
        return;
      }
      window.location.reload();
    } catch {
      setCompanyError(t.cannotUpdateCompany);
      setSavingCompany(false);
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
            <span className="font-semibold">{t.date}</span> {new Date(operation.createdAt).toLocaleString(locale)}
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
            <span className="font-semibold">{t.company}</span> {operation.companyName ?? "-"}
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold">{t.reviewFlag}</span>{" "}
            {operation.requiresReview ? (lang === "en" ? "Yes" : "Sí") : (lang === "en" ? "No" : "No")}
          </p>
        </div>
        {operation.canEditCompany && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">{t.selectOption}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex items-center rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-60"
              onClick={() => void changeCompany()}
              disabled={!companyId || companyId === operation.companyId || savingCompany}
            >
              {savingCompany ? t.savingCompany : t.changeCompany}
            </button>
            {companyError && <span className="text-xs text-rose-700">{companyError}</span>}
          </div>
        )}
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
            {validatedAt && <p className="mt-1 text-xs text-slate-500">{t.lastRun} {new Date(validatedAt).toLocaleString(locale)}</p>}
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
                    {finding.pair && <p className="mt-1 text-[11px] text-slate-500">{t.comparison} {finding.pair}</p>}
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
                  <p className="mt-1 text-[11px] text-slate-500">{doc.mimeType || t.genericDocument}</p>
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
                  <div className="border-t border-slate-200 bg-white p-3 space-y-2">
                    <a className="text-xs font-semibold text-navy underline" href={`/api/documents/${selectedDoc.id}`} target="_blank" rel="noreferrer">
                      {t.openDoc}
                    </a>
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          selectedDoc.hasPii ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-300 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {selectedDoc.hasPii ? t.piiDetected : t.noPii}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          selectedDoc.hasSignature ? "border-cyan-300 bg-cyan-50 text-cyan-800" : "border-slate-300 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {selectedDoc.hasSignature ? t.signatureDetected : t.noSignature}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t.summary}</p>
                    <div className="flex w-full max-w-full flex-wrap items-center justify-end gap-2 md:max-w-[520px]">
                      <button
                        type="button"
                        className="inline-flex rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
                        onClick={() => setShowPii((prev) => !prev)}
                      >
                        {showPii ? t.hidePii : t.showPii}
                      </button>
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
                        {filteredRows.map((row) => {
                          const displayValue = !showPii && selectedDoc.hasPii ? redactPiiText(row.value) : row.value;
                          return (
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
                                    {displayValue}
                                  </span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  <span>{displayValue}</span>
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                <button
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                  onClick={() => copyValue(displayValue)}
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
                                      {saveFieldLoading ? t.saving : t.save}
                                    </button>
                                    <button
                                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                      onClick={() => {
                                        setEditingKey(null);
                                        setEditingValue("");
                                      }}
                                      disabled={saveFieldLoading}
                                    >
                                      {t.cancel}
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-100"
                                    onClick={() => {
                                      setEditingKey(row.key);
                                      setEditingValue(row.value === "-" ? "" : row.value);
                                      setShowPii(true);
                                      setSaveFieldError(null);
                                    }}
                                  >
                                    {t.edit}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )})}
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
                {piiDetections.length > 0 && (
                  <span className="ml-3">
                    <span className="font-semibold">{t.piiSummary}</span>{" "}
                    {piiDetections.map((d) => `${d.type}:${d.count}`).join(", ")}
                  </span>
                )}
                {signatureHints.length > 0 && (
                  <span className="ml-3">
                    <span className="font-semibold">{t.signatureHints}</span> {signatureHints.join(", ")}
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p className="font-semibold">{t.reviewFlowTitle}</p>
                {selectedReviewFlow?.requiresReview ? (
                  <p className="mt-1">
                    {t.reviewRequired}
                    {selectedReviewFlow.flowName ? `: ${selectedReviewFlow.flowName}` : ""}.
                  </p>
                ) : (
                  <p className="mt-1">{t.reviewNotRequired}</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t.documentComments}</p>
                </div>
                <div className="mt-2 flex gap-2">
                  <textarea
                    className="min-h-20 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-cyan-500"
                    placeholder={t.addReviewComment}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="h-fit rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
                    onClick={() => void addComment()}
                    disabled={commentLoading}
                  >
                    {commentLoading ? t.saving : t.saveComment}
                  </button>
                </div>
                {commentError && <p className="mt-2 text-xs text-rose-700">{commentError}</p>}
                <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
                  {(selectedDoc ? commentsByDoc[selectedDoc.id] ?? [] : []).length === 0 && (
                    <p className="text-xs text-slate-500">{t.noComments}</p>
                  )}
                  {(selectedDoc ? commentsByDoc[selectedDoc.id] ?? [] : []).map((comment) => (
                    <div key={comment.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <p className="font-semibold text-slate-700">{comment.authorName}</p>
                      <p className="mt-1 whitespace-pre-wrap text-slate-700">
                        {!showPii && selectedDoc.hasPii ? redactPiiText(comment.text) : comment.text}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">{new Date(comment.createdAt).toLocaleString(locale)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDoc.extractedText && (
                <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <summary className="cursor-pointer font-semibold text-slate-700">{t.extractedText}</summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-slate-600">
                    {!showPii && selectedDoc.hasPii ? redactPiiText(selectedDoc.extractedText) : selectedDoc.extractedText}
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
