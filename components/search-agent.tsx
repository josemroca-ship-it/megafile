"use client";

import { Bot, Eraser, ExternalLink, Filter, MessageSquarePlus, SendHorizontal, User, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { DocumentThumbnail } from "@/components/document-thumbnail";

type Match = {
  operationId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  thumbnailUrl: string;
  matchReason: string;
  snippet?: string | null;
};

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string; matches: Match[]; streaming?: boolean; query?: string };

type SearchAgentProps = {
  username: string;
  operations: Array<{ id: string; label: string }>;
  initialOperationId?: string;
};

const QUICK_PROMPTS = [
  "📄 Últimas facturas cargadas",
  "🪪 Documentos por identificación",
  "🧾 Operaciones con cédula de identidad"
];

function initialMessage(): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    text: "Hola 👋, soy Megafile. Tu asistente inteligente para encontrar información en segundos.",
    matches: []
  };
}

export function SearchAgent({ username, operations, initialOperationId }: SearchAgentProps) {
  const [question, setQuestion] = useState("");
  const [selectedOperationId, setSelectedOperationId] = useState("all");
  const [searchMode, setSearchMode] = useState<"strict" | "broad">("strict");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage()]);
  const [selectedEvidence, setSelectedEvidence] = useState<{ match: Match; query: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hydratedRef = useRef(false);
  const autoScrollRef = useRef(true);

  const storageKey = useMemo(
    () => `bank-ai-chat-v1:${username}:${selectedOperationId}:${searchMode}`,
    [selectedOperationId, searchMode, username]
  );

  useEffect(() => {
    if (!initialOperationId) return;
    if (!operations.some((op) => op.id === initialOperationId)) return;
    setSelectedOperationId(initialOperationId);
  }, [initialOperationId, operations]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setMessages([initialMessage()]);
      } else {
        const parsed = JSON.parse(raw) as ChatMessage[];
        setMessages(parsed.length > 0 ? parsed : [initialMessage()]);
      }
    } catch {
      setMessages([initialMessage()]);
    } finally {
      hydratedRef.current = true;
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
  }, [messages, storageKey]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!autoScrollRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function animateAssistantMessage(id: string, answer: string, matches: Match[], query: string) {
    setMessages((prev) => [...prev, { id, role: "assistant", text: "", matches: [], streaming: true, query }]);

    if (answer.length > 600) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id && msg.role === "assistant" ? { ...msg, text: answer, matches, streaming: false } : msg
        )
      );
      return;
    }

    const step = Math.max(10, Math.floor(answer.length / 45));
    for (let i = step; i <= answer.length + step; i += step) {
      const chunk = answer.slice(0, i);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id && msg.role === "assistant" ? { ...msg, text: chunk } : msg))
      );
      await new Promise((resolve) => setTimeout(resolve, 8));
    }

    // Adjuntamos evidencias al final para evitar saltos durante el streaming.
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id && msg.role === "assistant"
          ? { ...msg, text: answer, matches, streaming: false }
          : msg
      )
    );
  }

  async function submitQuestion(rawPrompt: string) {
    const prompt = rawPrompt.trim();
    if (!prompt || loading) return;

    setQuestion("");
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: prompt }]);

    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: prompt,
        operationId: selectedOperationId === "all" ? undefined : selectedOperationId,
        mode: searchMode
      })
    });

    const data = (await response.json().catch(() => null)) as { answer?: string; matches?: Match[]; error?: string } | null;

    if (!response.ok) {
      setError(data?.error ?? "No se pudo procesar la búsqueda.");
      setLoading(false);
      return;
    }

    await animateAssistantMessage(crypto.randomUUID(), data?.answer ?? "Sin respuesta.", data?.matches ?? [], prompt);
    setLoading(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await submitQuestion(question);
  }

  function clearConversation() {
    const seed = [initialMessage()];
    setMessages(seed);
    localStorage.setItem(storageKey, JSON.stringify(seed));
  }

  return (
    <section className="space-y-6 reveal-soft">
      <div className="bank-card reveal overflow-hidden p-0" style={{ animationDelay: "40ms" }}>
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-navy">Agente conversacional de búsqueda</h2>
              <p className="mt-1 text-sm text-slate-600">Conversa con el agente y revisa las evidencias documentales de cada respuesta.</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={clearConversation}
            >
              <Eraser size={14} /> Limpiar chat
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Filter size={14} className="pointer-events-none absolute left-2 top-2.5 text-slate-400" />
              <select
                className="rounded-lg border border-slate-300 bg-white py-2 pl-7 pr-2 text-xs font-medium text-slate-700"
                value={selectedOperationId}
                onChange={(e) => setSelectedOperationId(e.target.value)}
              >
                <option value="all">Todas las operaciones</option>
                {operations.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>

            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
                onClick={() => submitQuestion(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}

            <div className="ml-auto inline-flex rounded-lg border border-slate-300 bg-white p-1 text-xs">
              <button
                type="button"
                className={`rounded-md px-3 py-1 font-semibold ${searchMode === "strict" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                onClick={() => setSearchMode("strict")}
                disabled={loading}
              >
                Preciso
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1 font-semibold ${searchMode === "broad" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                onClick={() => setSearchMode("broad")}
                disabled={loading}
              >
                Amplio
              </button>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="max-h-[60vh] space-y-4 overflow-auto bg-white px-4 py-4 md:px-6"
          onScroll={(e) => {
            const el = e.currentTarget;
            const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
            autoScrollRef.current = gap < 80;
          }}
        >
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-3xl rounded-2xl border px-4 py-3 ${
                  message.role === "user" ? "border-cyan-200 bg-cyan-50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {message.role === "user" ? <User size={13} /> : <Bot size={13} />}
                  {message.role === "user" ? "Tú" : "Agente"}
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-800">{message.text}</p>
                {message.role === "assistant" && message.streaming && (
                  <p className="mt-2 text-xs text-slate-500">🤖 preparando evidencias...</p>
                )}

                {message.role === "assistant" && message.matches.length > 0 && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {message.matches.map((match) => (
                      <article key={`${message.id}-${match.documentId}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="relative h-20 w-full bg-slate-100">
                          <button
                            type="button"
                            className="absolute inset-0 block h-full w-full text-left"
                            onClick={() =>
                              setSelectedEvidence({
                                match,
                                query: message.query ?? ""
                              })
                            }
                            title="Ver evidencia"
                          >
                            <DocumentThumbnail
                              documentId={match.documentId}
                              mimeType={match.mimeType}
                              fallbackSrc={match.thumbnailUrl}
                              alt={match.fileName}
                              fill
                              className="object-cover"
                            />
                          </button>
                        </div>
                        <div className="p-2 text-[11px]">
                          <p className="truncate font-semibold text-slate-800">{match.fileName}</p>
                          <p className="mt-1 inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-800">
                            🎯 {match.matchReason}
                          </p>
                          {match.snippet && (
                            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-600">{match.snippet}</p>
                          )}
                          <p className="text-slate-500">Operación: {match.operationId}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-semibold text-navy underline"
                              onClick={() =>
                                setSelectedEvidence({
                                  match,
                                  query: message.query ?? ""
                                })
                              }
                            >
                              Ver evidencia
                            </button>
                            <a
                              className="inline-flex items-center gap-1 font-semibold text-navy underline"
                              href={`/api/documents/${match.documentId}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink size={11} />
                              Abrir
                            </a>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <Bot size={14} /> 🤖 Analizando información...
                </span>
              </div>
            </div>
          )}
        </div>

        <form className="border-t border-slate-200 bg-slate-50 p-4 md:p-5" onSubmit={onSubmit}>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <MessageSquarePlus size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
              <input
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                placeholder="Ej: Busca facturas de Juan Pérez y muéstrame sus respaldos"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
            </div>
            <button className="bank-btn inline-flex items-center justify-center gap-2 md:w-56" type="submit" disabled={loading}>
              <SendHorizontal size={16} />
              {loading ? "Consultando..." : "Enviar consulta"}
            </button>
          </div>
          {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
        </form>
      </div>

      {selectedEvidence && (
        <EvidenceModal
          match={selectedEvidence.match}
          query={selectedEvidence.query}
          onClose={() => setSelectedEvidence(null)}
        />
      )}
    </section>
  );
}

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function queryTokens(query: string) {
  return Array.from(new Set(normalizeText(query).split(" ").filter((t) => t.length >= 3)));
}

function highlightText(text: string, query: string) {
  const tokens = queryTokens(query).sort((a, b) => b.length - a.length);
  if (!text || tokens.length === 0) return text;
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);
  const isMatch = (part: string) => tokens.some((t) => normalizeText(part) === normalizeText(t));
  return parts.map((part, idx) =>
    isMatch(part) ? (
      <mark key={`${part}-${idx}`} className="rounded bg-yellow-200 px-0.5 text-slate-900">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${idx}`}>{part}</span>
    )
  );
}

type EvidenceModalProps = {
  match: Match;
  query: string;
  onClose: () => void;
};

function EvidenceModal({ match, query, onClose }: EvidenceModalProps) {
  const [pdfSnippets, setPdfSnippets] = useState<Array<{ page: number; text: string }>>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [activePdfPage, setActivePdfPage] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPdfEvidence() {
      if (match.mimeType !== "application/pdf") return;
      setLoadingPdf(true);
      try {
        const response = await fetch(`/api/documents/${match.documentId}`);
        if (!response.ok) return;
        const bytes = new Uint8Array(await response.arrayBuffer());
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
        }
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const tokens = queryTokens(query);
        const snippets: Array<{ page: number; text: string }> = [];

        for (let p = 1; p <= pdf.numPages && snippets.length < 6; p += 1) {
          const page = await pdf.getPage(p);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => ("str" in item ? String(item.str) : ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          if (!pageText) continue;
          const lower = normalizeText(pageText);
          const hasMatch = tokens.length === 0 ? false : tokens.some((t) => lower.includes(t));
          if (!hasMatch) continue;

          let idx = -1;
          for (const t of tokens) {
            idx = lower.indexOf(t);
            if (idx >= 0) break;
          }
          const start = Math.max(0, idx - 120);
          const end = Math.min(pageText.length, idx + 180);
          snippets.push({
            page: p,
            text: `${start > 0 ? "..." : ""}${pageText.slice(start, end)}${end < pageText.length ? "..." : ""}`
          });
        }

        if (!cancelled) {
          setPdfSnippets(snippets);
          setActivePdfPage((prev) => prev ?? snippets[0]?.page ?? 1);
        }
      } catch {
        if (!cancelled) setPdfSnippets([]);
      } finally {
        if (!cancelled) setLoadingPdf(false);
      }
    }

    void loadPdfEvidence();
    return () => {
      cancelled = true;
    };
  }, [match.documentId, match.mimeType, query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4" onClick={onClose}>
      <div
        className="bank-card w-full max-w-5xl overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Vista de evidencia</p>
            <p className="text-sm font-semibold text-slate-800">{match.fileName}</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-slate-200 bg-slate-100 lg:border-b-0 lg:border-r">
            {match.mimeType.startsWith("image/") ? (
              <div className="relative h-[46vh] min-h-[320px] w-full">
                <DocumentThumbnail
                  documentId={match.documentId}
                  mimeType={match.mimeType}
                  fallbackSrc={match.thumbnailUrl}
                  alt={match.fileName}
                  fill
                  className="object-contain"
                />
              </div>
            ) : match.mimeType === "application/pdf" ? (
              <PdfEvidencePreview documentId={match.documentId} query={query} pageNumber={activePdfPage ?? 1} />
            ) : (
              <iframe
                title={`Documento ${match.fileName}`}
                src={`/api/documents/${match.documentId}`}
                className="h-[46vh] min-h-[320px] w-full bg-white"
              />
            )}
          </div>

          <div className="max-h-[46vh] min-h-[320px] overflow-auto p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-cyan-50 px-2 py-1 font-semibold text-cyan-800">🎯 {match.matchReason}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600">Operación {match.operationId}</span>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Consulta</p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {query || "Consulta no disponible"}
            </p>

            {match.mimeType === "application/pdf" ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Coincidencias detectadas {loadingPdf ? "(analizando PDF...)" : ""}
                </p>
                {pdfSnippets.length > 0 ? (
                  <div className="space-y-2">
                    {pdfSnippets.map((snippet, idx) => (
                      <button
                        key={`${snippet.page}-${idx}`}
                        type="button"
                        onClick={() => setActivePdfPage(snippet.page)}
                        className={`block w-full rounded-lg border p-3 text-left text-xs leading-relaxed ${
                          activePdfPage === snippet.page
                            ? "border-yellow-300 bg-yellow-50 text-slate-800"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Página {snippet.page}
                        </p>
                        <p>{highlightText(snippet.text, query)}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    No fue posible localizar una coincidencia exacta dentro del texto del PDF en el cliente. Puedes abrir el documento completo para revisarlo.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Evidencia textual</p>
                {match.snippet ? (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700">
                    {highlightText(match.snippet, query)}
                  </div>
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Sin snippet disponible para este documento.
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  En imágenes/escaneados, el resaltado visual sobre el documento requiere OCR con coordenadas (siguiente fase).
                </p>
              </div>
            )}

            <a
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-navy underline"
              href={`/api/documents/${match.documentId}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={12} />
              Abrir documento completo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function PdfEvidencePreview({
  documentId,
  query,
  pageNumber
}: {
  documentId: string;
  query: string;
  pageNumber: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<Array<{ left: number; top: number; width: number; height: number }>>([]);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    let cancelled = false;

    async function renderPdfPage() {
      setLoading(true);
      setError(null);
      setBoxes([]);
      try {
        const response = await fetch(`/api/documents/${documentId}`);
        if (!response.ok) throw new Error("No fue posible cargar el PDF");
        const bytes = new Uint8Array(await response.arrayBuffer());
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
        }

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const safePage = Math.min(Math.max(1, pageNumber), pdf.numPages);
        const page = await pdf.getPage(safePage);
        const viewport = page.getViewport({ scale: 1.25 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas no disponible");

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({ canvasContext: context, viewport }).promise;

        const tokens = queryTokens(query);
        if (!cancelled) {
          setViewportSize({ width: viewport.width, height: viewport.height });
        }

        if (tokens.length === 0) {
          if (!cancelled) setBoxes([]);
          return;
        }

        const textContent = await page.getTextContent();
        const foundBoxes: Array<{ left: number; top: number; width: number; height: number }> = [];

        for (const item of textContent.items as any[]) {
          const str = typeof item?.str === "string" ? item.str : "";
          if (!str.trim()) continue;
          const normalized = normalizeText(str);
          const hasMatch = tokens.some((t) => normalized.includes(t));
          if (!hasMatch) continue;

          const x = Number(item.transform?.[4] ?? 0) * viewport.scale;
          const y = Number(item.transform?.[5] ?? 0) * viewport.scale;
          const width = Math.max(20, Number(item.width ?? 0) * viewport.scale);
          const height = Math.max(12, Number(item.height ?? 0) * viewport.scale);
          const top = viewport.height - y - height;

          foundBoxes.push({
            left: Math.max(0, x - 2),
            top: Math.max(0, top - 1),
            width: Math.min(viewport.width - x, width + 4),
            height: height + 2
          });
        }

        if (!cancelled) {
          setBoxes(foundBoxes.slice(0, 60));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No fue posible renderizar el PDF");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void renderPdfPage();
    return () => {
      cancelled = true;
    };
  }, [documentId, pageNumber, query]);

  return (
    <div className="relative flex h-[46vh] min-h-[320px] items-center justify-center overflow-auto bg-slate-200 p-3">
      <div className="relative inline-block rounded-lg bg-white shadow-sm">
        <canvas ref={canvasRef} className="block max-h-[42vh] w-auto rounded-lg" />
        {viewportSize.width > 0 &&
          boxes.map((box, idx) => (
            <div
              key={`${box.left}-${box.top}-${idx}`}
              className="pointer-events-none absolute rounded border border-yellow-500/80 bg-yellow-300/35"
              style={{
                left: `${(box.left / viewportSize.width) * 100}%`,
                top: `${(box.top / viewportSize.height) * 100}%`,
                width: `${(box.width / viewportSize.width) * 100}%`,
                height: `${(box.height / viewportSize.height) * 100}%`
              }}
            />
          ))}
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/10 text-xs font-semibold text-slate-700">
          Cargando PDF y resaltando coincidencias...
        </div>
      )}
      {error && (
        <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}
