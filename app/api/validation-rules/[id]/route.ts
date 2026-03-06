import { NextResponse } from "next/server";
import { Role, ValidationDocumentType, ValidationRuleKey, ValidationSeverity } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  ruleKey: z.nativeEnum(ValidationRuleKey).optional(),
  documentType: z.nativeEnum(ValidationDocumentType).optional(),
  severity: z.nativeEnum(ValidationSeverity).optional(),
  isActive: z.boolean().optional(),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const { id } = await params;
  const body = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const existing = await prisma.validationRule.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 });

  const rule = await prisma.validationRule.update({
    where: { id },
    data: {
      name: body.data.name,
      ruleKey: body.data.ruleKey,
      documentType: body.data.documentType,
      severity: body.data.severity,
      isActive: body.data.isActive,
      config: body.data.config
    },
    include: { company: { select: { id: true, name: true } } }
  });

  return NextResponse.json({ rule });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.validationRule.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 });

  await prisma.validationRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
