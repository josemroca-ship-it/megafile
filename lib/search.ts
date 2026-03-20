import { prisma } from "@/lib/prisma";

const STOPWORDS = new Set([
  "de",
  "la",
  "el",
  "los",
  "las",
  "y",
  "o",
  "a",
  "en",
  "del",
  "al",
  "por",
  "para",
  "con",
  "que",
  "un",
  "una",
  "se",
  "me",
  "mi",
  "quiero",
  "mostrar",
  "busca",
  "buscar",
  "que",
  "cual",
  "cuales",
  "hay",
  "es"
]);

const SURGERY_QUERY_TERMS = ["cirugia", "cirugias", "cirujia", "cirujias", "procedimiento", "procedimientos", "intervencion", "intervenciones"];
const SURGERY_DOC_SIGNALS = [
  "cirugia",
  "cirug",
  "procedimiento",
  "intervencion",
  "operatorio",
  "quirurg",
  "preoperatorio",
  "postoperatorio"
];

export function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string) {
  return normalize(input)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function digitsOnly(input: string) {
  return input.replace(/\D+/g, "");
}

function hasAnyToken(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export type SearchMatch = {
  operationId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  thumbnailUrl: string;
  snippet: string | null;
  storageUrl: string;
  createdAt: Date;
  score: number;
  matchedTokens: number;
  confidence: number;
  matchReason: string;
  context: string;
};

function buildSnippet(sourceText: string, question: string, tokens: string[]) {
  const raw = sourceText.replace(/\s+/g, " ").trim();
  if (!raw) return null;

  const lowerRaw = raw.toLowerCase();
  const normalizedQuestion = normalize(question);
  const directNeedle = normalizedQuestion.length >= 4 ? normalizedQuestion.split(" ").find((p) => p.length >= 4) : null;

  let idx = -1;
  const candidates = [directNeedle, ...tokens.filter((t) => t.length >= 3)].filter(Boolean) as string[];
  for (const candidate of candidates) {
    idx = lowerRaw.indexOf(candidate.toLowerCase());
    if (idx >= 0) break;
  }

  if (idx < 0) return raw.slice(0, 220);

  const start = Math.max(0, idx - 90);
  const end = Math.min(raw.length, idx + 140);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < raw.length ? "..." : "";
  return `${prefix}${raw.slice(start, end)}${suffix}`;
}

export async function findSearchMatches(input: {
  question: string;
  operationId?: string;
  mode?: "strict" | "broad";
  companyId?: string;
}) {
  const MAX_OPERATIONS = input.operationId ? 1 : 80;
  const MAX_DOCS_PER_OPERATION = input.operationId ? 24 : input.mode === "broad" ? 10 : 6;
  const MAX_FIELDS_CHARS = 1500;
  const MAX_TEXT_CHARS = 2200;
  const MAX_CONTEXT_MATCHES = 4;

  const operations = await prisma.operation.findMany({
    where: {
      ...(input.operationId ? { id: input.operationId } : {}),
      ...(input.companyId ? { companyId: input.companyId } : {})
    },
    orderBy: { createdAt: "desc" },
    take: MAX_OPERATIONS,
    select: {
      id: true,
      clientName: true,
      clientRut: true,
      aiSummary: true,
      createdAt: true,
      documents: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          thumbnailUrl: true,
          storageUrl: true,
          extractedText: true,
          extractedFields: true,
          comments: {
            select: { text: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 8
          },
          createdAt: true
        },
        orderBy: { createdAt: "desc" },
        take: MAX_DOCS_PER_OPERATION
      }
    }
  });

  const tokens = tokenize(input.question);
  const qNormalized = normalize(input.question);
  const queryDigits = digitsOnly(input.question);
  const queryWords = qNormalized.split(" ").filter((w) => w.length >= 3);
  const queryHasSurgeryIntent = hasAnyToken(qNormalized, SURGERY_QUERY_TERMS);
  const comparativeIntent =
    /(coincid|compar|igual|mismo|misma|difer|consisten|consistencia|mercancia|mercaderia|monto|total)/i.test(
      qNormalized
    );

  const scored: SearchMatch[] = operations.flatMap((operation) =>
    operation.documents.map((doc) => {
      const fieldsRaw = JSON.stringify(doc.extractedFields ?? {});
      const fieldsText = fieldsRaw.slice(0, MAX_FIELDS_CHARS);
      const extractedText = (doc.extractedText ?? "").slice(0, MAX_TEXT_CHARS);
      const commentsText = doc.comments.map((c) => c.text).join(" ").slice(0, 1000);
      const snippet = buildSnippet(`${extractedText}\n${fieldsText}\n${commentsText}`, input.question, tokens);
      const docHaystack = normalize(`${doc.fileName} ${extractedText} ${fieldsText} ${commentsText}`);
      const docDigits = digitsOnly(`${doc.fileName} ${extractedText} ${fieldsText} ${commentsText}`);
      const docWords = docHaystack.split(" ").filter((w) => w.length >= 3);
      const docHasSurgerySignals = hasAnyToken(docHaystack, SURGERY_DOC_SIGNALS);

      let score = 0;
      let matchedTokens = 0;
      let reason = "Coincidencia por contenido del documento";
      for (const token of tokens) {
        if (docHaystack.includes(token)) {
          matchedTokens += 1;
          score += token.length > 5 ? 2 : 1;
        }
      }

      // Matching flexible para cubrir variaciones comunes (acentos, plural, raíces).
      for (const token of tokens) {
        if (docHaystack.includes(token)) continue;
        const prefix = token.slice(0, 4);
        if (prefix.length < 4) continue;
        if (docWords.some((word) => word.startsWith(prefix) || token.startsWith(word.slice(0, 4)))) {
          matchedTokens += 1;
          score += 1;
          reason = "Coincidencia aproximada por término";
        }
      }

      if (qNormalized.length >= 6 && docHaystack.includes(qNormalized)) {
        score += 3;
        reason = "Coincidencia exacta de frase";
      }

      if (queryDigits.length >= 6 && docDigits.includes(queryDigits)) {
        matchedTokens += 1;
        score += 4;
        reason = "Coincidencia por número exacto";
      }

      const normalizedRut = normalize(operation.clientRut);
      if (normalizedRut && qNormalized.includes(normalizedRut)) score += 5;
      const clientNameParts = normalize(operation.clientName).split(" ").filter((part) => part.length > 2);
      const clientNameHits = clientNameParts.filter((part) => qNormalized.includes(part)).length;
      if (clientNameHits > 0) {
        score += Math.min(6, clientNameHits * 2);
        matchedTokens += 1;
        reason = "Coincidencia por cliente";
      }
      if (normalize(doc.fileName).split(" ").some((part) => part.length > 2 && qNormalized.includes(part))) score += 2;
      if (commentsText && tokens.some((token) => normalize(commentsText).includes(token))) score += 2;
      if (snippet && snippet.length > 20) score += 1;

      if (queryHasSurgeryIntent && docHasSurgerySignals) {
        score += 4;
        matchedTokens += 1;
        reason = "Coincidencia por contenido clínico";
      }
      if (queryWords.length > 0 && queryWords.every((word) => operation.clientName && normalize(operation.clientName).includes(word))) {
        score += 3;
        matchedTokens += 1;
      }

      const tokenCoverage = tokens.length > 0 ? matchedTokens / tokens.length : 0;
      const confidence = Number(Math.max(0, Math.min(1, 0.25 + tokenCoverage * 0.55 + Math.min(0.2, score / 25))).toFixed(2));

      return {
        operationId: operation.id,
        documentId: doc.id,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        thumbnailUrl: doc.thumbnailUrl,
        snippet,
        storageUrl: doc.storageUrl,
        createdAt: operation.createdAt,
        score,
        matchedTokens,
        confidence,
        matchReason: reason,
        context: `OPERACION=${operation.id}\nCLIENTE=${operation.clientName}\nRUT=${operation.clientRut}\nDOCUMENTO=${doc.id}:${doc.fileName}\nEXTRACCION=${fieldsText}\nTEXTO=${extractedText}\nCOMENTARIOS=${commentsText}`
      };
    })
  );

  const sorted = scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const withScore = sorted.filter((item) => item.score > 0 && item.matchedTokens > 0);
  let topMatches: SearchMatch[];

  if (input.mode === "broad") {
    topMatches = withScore.slice(0, 8);
  } else if (withScore.length > 0) {
    const bestScore = withScore[0].score;
    const bestTokens = withScore[0].matchedTokens;
    const minScore = Math.max(2, bestScore - 2);
    const minTokens = Math.max(1, bestTokens - 1);

    topMatches = withScore
      .filter((item) => item.score >= minScore && item.matchedTokens >= minTokens)
      .slice(0, 8);
  } else {
    // Fallback semántico para comparativas dentro de una operación acotada.
    if (input.operationId && comparativeIntent) {
      topMatches = sorted
        .filter((item) => item.context.includes("EXTRACCION=") || item.context.includes("TEXTO="))
        .slice(0, 8)
        .map((item) => ({
          ...item,
          score: Math.max(item.score, 1),
          matchedTokens: Math.max(item.matchedTokens, 1),
          confidence: Math.max(item.confidence, 0.35),
          matchReason: "Contexto comparativo de la operación"
        }));
    } else if (queryHasSurgeryIntent) {
      topMatches = sorted
        .filter((item) => hasAnyToken(normalize(`${item.fileName} ${item.snippet ?? ""}`), SURGERY_DOC_SIGNALS))
        .slice(0, 8)
        .map((item) => ({
          ...item,
          score: Math.max(item.score, 1),
          matchedTokens: Math.max(item.matchedTokens, 1),
          confidence: Math.max(item.confidence, 0.35),
          matchReason: "Contexto clínico de la consulta"
        }));
    } else {
      // Sin coincidencias reales: no devolvemos documentos irrelevantes.
      topMatches = [];
    }
  }

  const context =
    topMatches
      .slice(0, MAX_CONTEXT_MATCHES)
      .map((m) => m.context)
      .join("\n\n---\n\n") ||
    "No hay documentos cargados todavía para responder esta pregunta.";

  return { topMatches, context };
}
