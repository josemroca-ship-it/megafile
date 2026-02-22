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
  "buscar"
]);

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
}) {
  const MAX_OPERATIONS = input.operationId ? 1 : 80;
  const MAX_FIELDS_CHARS = 1500;
  const MAX_TEXT_CHARS = 2200;
  const MAX_CONTEXT_MATCHES = 4;

  const operations = await prisma.operation.findMany({
    where: input.operationId ? { id: input.operationId } : undefined,
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
          createdAt: true
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  const tokens = tokenize(input.question);
  const qNormalized = normalize(input.question);
  const queryDigits = digitsOnly(input.question);

  const scored: SearchMatch[] = operations.flatMap((operation) =>
    operation.documents.map((doc) => {
      const fieldsRaw = JSON.stringify(doc.extractedFields ?? {});
      const fieldsText = fieldsRaw.slice(0, MAX_FIELDS_CHARS);
      const extractedText = (doc.extractedText ?? "").slice(0, MAX_TEXT_CHARS);
      const snippet = buildSnippet(`${extractedText}\n${fieldsText}`, input.question, tokens);
      const docHaystack = normalize(`${doc.fileName} ${extractedText} ${fieldsText}`);
      const docDigits = digitsOnly(`${doc.fileName} ${extractedText} ${fieldsText}`);

      let score = 0;
      let matchedTokens = 0;
      let reason = "Coincidencia por contenido del documento";
      for (const token of tokens) {
        if (docHaystack.includes(token)) {
          matchedTokens += 1;
          score += token.length > 5 ? 2 : 1;
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
      if (normalize(operation.clientName).split(" ").some((part) => part.length > 2 && qNormalized.includes(part))) score += 3;
      if (normalize(doc.fileName).split(" ").some((part) => part.length > 2 && qNormalized.includes(part))) score += 2;

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
        matchReason: reason,
        context: `OPERACION=${operation.id}\nCLIENTE=${operation.clientName}\nRUT=${operation.clientRut}\nDOCUMENTO=${doc.id}:${doc.fileName}\nEXTRACCION=${fieldsText}\nTEXTO=${extractedText}`
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
    // Sin coincidencias reales: no devolvemos documentos irrelevantes.
    topMatches = [];
  }

  const context =
    topMatches
      .slice(0, MAX_CONTEXT_MATCHES)
      .map((m) => m.context)
      .join("\n\n---\n\n") ||
    "No hay documentos cargados todavía para responder esta pregunta.";

  return { topMatches, context };
}
