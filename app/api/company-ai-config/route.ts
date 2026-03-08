import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  companyId: z.string().min(1),
  extractionProvider: z.enum(["openai", "gemini", "anthropic"]).optional().nullable(),
  extractionModel: z.string().max(120).optional().nullable(),
  extractionPrompt: z.string().max(12000).optional().nullable(),
  searchProvider: z.enum(["openai", "gemini", "anthropic"]).optional().nullable(),
  searchModel: z.string().max(120).optional().nullable(),
  searchPrompt: z.string().max(12000).optional().nullable(),
  openaiApiKey: z.string().max(300).optional().nullable(),
  geminiApiKey: z.string().max(300).optional().nullable(),
  anthropicApiKey: z.string().max(300).optional().nullable(),
  clearOpenaiApiKey: z.boolean().optional(),
  clearGeminiApiKey: z.boolean().optional(),
  clearAnthropicApiKey: z.boolean().optional()
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  if (companyId) {
    const config = await prisma.companyAiConfig.findUnique({
      where: { companyId },
      select: {
        id: true,
        companyId: true,
        extractionProvider: true,
        extractionModel: true,
        extractionPrompt: true,
        searchProvider: true,
        searchModel: true,
        searchPrompt: true,
        openaiApiKey: true,
        geminiApiKey: true,
        anthropicApiKey: true,
        updatedAt: true
      }
    });
    return NextResponse.json({
      config: config
        ? {
            id: config.id,
            companyId: config.companyId,
            extractionProvider: config.extractionProvider,
            extractionModel: config.extractionModel,
            extractionPrompt: config.extractionPrompt,
            searchProvider: config.searchProvider,
            searchModel: config.searchModel,
            searchPrompt: config.searchPrompt,
            hasOpenaiApiKey: Boolean(config.openaiApiKey),
            hasGeminiApiKey: Boolean(config.geminiApiKey),
            hasAnthropicApiKey: Boolean(config.anthropicApiKey),
            updatedAt: config.updatedAt
          }
        : null
    });
  }

  const configs = await prisma.companyAiConfig.findMany({
    include: { company: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" }
  });
  return NextResponse.json({ configs });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: body.data.companyId }, select: { id: true } });
  if (!company) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const config = await prisma.companyAiConfig.upsert({
    where: { companyId: body.data.companyId },
    update: {
      extractionProvider: body.data.extractionProvider ?? null,
      extractionModel: body.data.extractionModel ?? null,
      extractionPrompt: body.data.extractionPrompt ?? null,
      searchProvider: body.data.searchProvider ?? null,
      searchModel: body.data.searchModel ?? null,
      searchPrompt: body.data.searchPrompt ?? null,
      openaiApiKey: body.data.clearOpenaiApiKey ? null : body.data.openaiApiKey?.trim() || undefined,
      geminiApiKey: body.data.clearGeminiApiKey ? null : body.data.geminiApiKey?.trim() || undefined,
      anthropicApiKey: body.data.clearAnthropicApiKey ? null : body.data.anthropicApiKey?.trim() || undefined
    },
    create: {
      companyId: body.data.companyId,
      extractionProvider: body.data.extractionProvider ?? null,
      extractionModel: body.data.extractionModel ?? null,
      extractionPrompt: body.data.extractionPrompt ?? null,
      searchProvider: body.data.searchProvider ?? null,
      searchModel: body.data.searchModel ?? null,
      searchPrompt: body.data.searchPrompt ?? null,
      openaiApiKey: body.data.clearOpenaiApiKey ? null : body.data.openaiApiKey?.trim() || null,
      geminiApiKey: body.data.clearGeminiApiKey ? null : body.data.geminiApiKey?.trim() || null,
      anthropicApiKey: body.data.clearAnthropicApiKey ? null : body.data.anthropicApiKey?.trim() || null
    },
    select: {
      id: true,
      companyId: true,
      extractionProvider: true,
      extractionModel: true,
      extractionPrompt: true,
      searchProvider: true,
      searchModel: true,
      searchPrompt: true,
      openaiApiKey: true,
      geminiApiKey: true,
      anthropicApiKey: true,
      updatedAt: true
    }
  });

  return NextResponse.json({
    config: {
      id: config.id,
      companyId: config.companyId,
      extractionProvider: config.extractionProvider,
      extractionModel: config.extractionModel,
      extractionPrompt: config.extractionPrompt,
      searchProvider: config.searchProvider,
      searchModel: config.searchModel,
      searchPrompt: config.searchPrompt,
      hasOpenaiApiKey: Boolean(config.openaiApiKey),
      hasGeminiApiKey: Boolean(config.geminiApiKey),
      hasAnthropicApiKey: Boolean(config.anthropicApiKey),
      updatedAt: config.updatedAt
    }
  });
}
