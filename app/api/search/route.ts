import { NextResponse } from "next/server";
import { z } from "zod";
import { answerSearchQuestion } from "@/lib/ai";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findSearchMatches } from "@/lib/search";
import { decryptSecret } from "@/lib/secrets";

const schema = z.object({
  question: z.string().min(3),
  operationId: z.string().min(1).optional(),
  companyId: z.string().min(1).optional(),
  mode: z.enum(["strict", "broad"]).optional(),
  lang: z.enum(["es", "en"]).optional()
});

type CachedSearchResponse = {
  answer: string;
  matches: Array<{
    operationId: string;
    documentId: string;
    fileName: string;
    mimeType: string;
    thumbnailUrl: string;
    matchReason: string;
    snippet?: string | null;
    confidence?: number;
  }>;
  meta: {
    confidence: number;
    evidenceCount: number;
    operationCount: number;
    mode: "strict" | "broad";
    cache: "HIT" | "MISS";
  };
};

const SEARCH_CACHE_TTL_MS = 90 * 1000;
const SEARCH_CACHE_MAX_ITEMS = 200;
const searchCache = new Map<string, { expiresAt: number; value: CachedSearchResponse }>();

function buildCacheKey(input: {
  userId: string;
  question: string;
  operationId?: string;
  companyId?: string;
  mode?: "strict" | "broad";
  lang: "es" | "en";
  prompt: string | null;
  provider: "openai" | "gemini" | "anthropic" | null;
  model: string | null;
}) {
  return JSON.stringify({
    u: input.userId,
    q: input.question.trim().toLowerCase(),
    op: input.operationId ?? "all",
    co: input.companyId ?? "all",
    m: input.mode ?? "strict",
    l: input.lang,
    p: input.prompt ?? "",
    pr: input.provider ?? "",
    mo: input.model ?? ""
  });
}

function putCache(key: string, value: CachedSearchResponse) {
  if (searchCache.size >= SEARCH_CACHE_MAX_ITEMS) {
    const oldestKey = searchCache.keys().next().value as string | undefined;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, value });
}

function getCache(key: string): CachedSearchResponse | null {
  const hit = searchCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    searchCache.delete(key);
    return null;
  }
  return hit.value;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ANALISTA") {
    return NextResponse.json({ error: "Solo ANALISTA puede usar la búsqueda IA" }, { status: 403 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Pregunta inválida" }, { status: 400 });
  }
  const lang = body.data.lang === "en" ? "en" : "es";
  const operationCompanyId = body.data.operationId
    ? (await prisma.operation.findUnique({
        where: { id: body.data.operationId },
        select: { companyId: true }
      }))?.companyId ?? null
    : null;
  const targetCompanyId = body.data.companyId ?? operationCompanyId ?? null;

  const promptConfig = targetCompanyId
    ? await prisma.companyAiConfig.findUnique({
        where: { companyId: targetCompanyId },
        select: {
          searchPrompt: true,
          searchProvider: true,
          searchModel: true,
          openaiApiKey: true,
          geminiApiKey: true,
          anthropicApiKey: true
        }
      })
    : null;
  const cacheKey = buildCacheKey({
    userId: session.userId,
    question: body.data.question,
    operationId: body.data.operationId,
    companyId: body.data.companyId,
    mode: body.data.mode,
    lang,
    prompt: promptConfig?.searchPrompt ?? null,
    provider: (promptConfig?.searchProvider as "openai" | "gemini" | "anthropic" | null | undefined) ?? null,
    model: promptConfig?.searchModel ?? null
  });
  const cached = getCache(cacheKey);
  if (cached) {
    return NextResponse.json({
      ...cached,
      meta: {
        ...cached.meta,
        cache: "HIT"
      }
    });
  }

  const { topMatches, context } = await findSearchMatches({
    question: body.data.question,
    operationId: body.data.operationId,
    companyId: body.data.companyId,
    mode: body.data.mode
  });

  if (topMatches.length === 0) {
    return NextResponse.json({
      answer:
        lang === "en"
          ? "I did not find relevant matches in uploaded documents for that request."
          : "No encontré coincidencias relevantes en los documentos cargados para esa consulta.",
      matches: [],
      meta: {
        confidence: 0,
        evidenceCount: 0,
        operationCount: 0,
        mode: body.data.mode ?? "strict",
        cache: "MISS"
      }
    });
  }

  const answer = await answerSearchQuestion({
    question: body.data.question,
    context,
    lang,
    customPrompt: promptConfig?.searchPrompt ?? null,
    provider: (promptConfig?.searchProvider as "openai" | "gemini" | "anthropic" | null | undefined) ?? null,
    model: promptConfig?.searchModel ?? null,
    apiKeys: {
      openaiApiKey: promptConfig?.openaiApiKey ? decryptSecret(promptConfig.openaiApiKey) : null,
      geminiApiKey: promptConfig?.geminiApiKey ? decryptSecret(promptConfig.geminiApiKey) : null,
      anthropicApiKey: promptConfig?.anthropicApiKey ? decryptSecret(promptConfig.anthropicApiKey) : null
    }
  });

  const sanitizedMatches = topMatches.map(
    ({ context: _context, score: _score, matchedTokens: _matchedTokens, createdAt: _createdAt, storageUrl: _storageUrl, ...rest }) =>
      rest
  );
  const operationsUsed = new Set(topMatches.map((match) => match.operationId)).size;
  const averageConfidence = Number(
    (
      topMatches.reduce((acc, match) => acc + (match.confidence ?? 0), 0) /
      Math.max(1, topMatches.length)
    ).toFixed(2)
  );
  const payload: CachedSearchResponse = {
    answer,
    matches: sanitizedMatches,
    meta: {
      confidence: averageConfidence,
      evidenceCount: sanitizedMatches.length,
      operationCount: operationsUsed,
      mode: body.data.mode ?? "strict",
      cache: "MISS"
    }
  };
  putCache(cacheKey, payload);
  return NextResponse.json(payload);
}
