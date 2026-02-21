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

export type SearchMatch = {
  operationId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  thumbnailUrl: string;
  storageUrl: string;
  createdAt: Date;
  score: number;
  matchedTokens: number;
  context: string;
};

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

  const scored: SearchMatch[] = operations.flatMap((operation) =>
    operation.documents.map((doc) => {
      const fieldsRaw = JSON.stringify(doc.extractedFields ?? {});
      const fieldsText = fieldsRaw.slice(0, MAX_FIELDS_CHARS);
      const extractedText = (doc.extractedText ?? "").slice(0, MAX_TEXT_CHARS);
      const haystackRaw = `${operation.clientName} ${operation.clientRut} ${(operation.aiSummary ?? "").slice(0, 1200)} ${doc.fileName} ${extractedText} ${fieldsText}`;
      const haystack = normalize(haystackRaw);

      let score = 0;
      let matchedTokens = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) {
          matchedTokens += 1;
          score += token.length > 5 ? 2 : 1;
        }
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
        storageUrl: doc.storageUrl,
        createdAt: operation.createdAt,
        score,
        matchedTokens,
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
    topMatches = (withScore.length > 0 ? withScore : sorted).slice(0, 8);
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
