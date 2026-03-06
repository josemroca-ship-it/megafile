import { NextResponse } from "next/server";
import { Role, ValidationComparator, ValidationDocumentType, ValidationSeverity } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  sourceDocumentType: z.nativeEnum(ValidationDocumentType).optional(),
  targetDocumentType: z.nativeEnum(ValidationDocumentType).optional(),
  sourceFieldPath: z.string().trim().min(1).max(200).optional(),
  targetFieldPath: z.string().trim().min(1).max(200).optional(),
  comparator: z.nativeEnum(ValidationComparator).optional(),
  severity: z.nativeEnum(ValidationSeverity).optional(),
  tolerancePct: z.number().optional().nullable(),
  toleranceAbs: z.number().optional().nullable(),
  isActive: z.boolean().optional()
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const exists = await prisma.validationFieldRule.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 });

  const rule = await prisma.validationFieldRule.update({
    where: { id },
    data: {
      name: body.data.name,
      sourceDocumentType: body.data.sourceDocumentType,
      targetDocumentType: body.data.targetDocumentType,
      sourceFieldPath: body.data.sourceFieldPath,
      targetFieldPath: body.data.targetFieldPath,
      comparator: body.data.comparator,
      severity: body.data.severity,
      tolerancePct: body.data.tolerancePct,
      toleranceAbs: body.data.toleranceAbs,
      isActive: body.data.isActive
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
  const exists = await prisma.validationFieldRule.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 });
  await prisma.validationFieldRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
