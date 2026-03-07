import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  companyId: z.string().min(1),
  extractionPrompt: z.string().max(12000).optional().nullable(),
  searchPrompt: z.string().max(12000).optional().nullable()
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
      select: { id: true, companyId: true, extractionPrompt: true, searchPrompt: true, updatedAt: true }
    });
    return NextResponse.json({ config });
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
      extractionPrompt: body.data.extractionPrompt ?? null,
      searchPrompt: body.data.searchPrompt ?? null
    },
    create: {
      companyId: body.data.companyId,
      extractionPrompt: body.data.extractionPrompt ?? null,
      searchPrompt: body.data.searchPrompt ?? null
    },
    select: { id: true, companyId: true, extractionPrompt: true, searchPrompt: true, updatedAt: true }
  });

  return NextResponse.json({ config });
}
