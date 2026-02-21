"use client";

import Image from "next/image";
import { Bot, Eraser, Filter, MessageSquarePlus, SendHorizontal, User } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Match = {
  operationId: string;
  documentId: string;
  fileName: string;
  thumbnailUrl: string;
};

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string; matches: Match[]; streaming?: boolean };

type SearchAgentProps = {
  username: string;
  operations: Array<{ id: string; label: string }>;
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

export function SearchAgent({ username, operations }: SearchAgentProps) {
  const [question, setQuestion] = useState("");
  const [selectedOperationId, setSelectedOperationId] = useState("all");
  const [searchMode, setSearchMode] = useState<"strict" | "broad">("strict");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage()]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hydratedRef = useRef(false);
  const autoScrollRef = useRef(true);

  const storageKey = useMemo(
    () => `bank-ai-chat-v1:${username}:${selectedOperationId}:${searchMode}`,
    [selectedOperationId, searchMode, username]
  );

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

  async function animateAssistantMessage(id: string, answer: string, matches: Match[]) {
    setMessages((prev) => [...prev, { id, role: "assistant", text: "", matches: [], streaming: true }]);

    const step = Math.max(4, Math.floor(answer.length / 70));
    for (let i = step; i <= answer.length + step; i += step) {
      const chunk = answer.slice(0, i);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id && msg.role === "assistant" ? { ...msg, text: chunk } : msg))
      );
      await new Promise((resolve) => setTimeout(resolve, 16));
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

    await animateAssistantMessage(crypto.randomUUID(), data?.answer ?? "Sin respuesta.", data?.matches ?? []);
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
                          <Image src={match.thumbnailUrl} alt={match.fileName} fill className="object-cover" unoptimized />
                        </div>
                        <div className="p-2 text-[11px]">
                          <p className="truncate font-semibold text-slate-800">{match.fileName}</p>
                          <p className="text-slate-500">Operación: {match.operationId}</p>
                          <a
                            className="mt-1 inline-block font-semibold text-navy underline"
                            href={`/api/documents/${match.documentId}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir documento
                          </a>
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
    </section>
  );
}
