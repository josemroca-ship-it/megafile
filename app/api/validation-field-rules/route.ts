import { NextResponse } from "next/server";
import { Role, ValidationComparator, ValidationDocumentType, ValidationSeverity } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  companyId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  sourceDocumentType: z.nativeEnum(ValidationDocumentType),
  targetDocumentType: z.nativeEnum(ValidationDocumentType),
  sourceFieldPath: z.string().trim().min(1).max(200),
  targetFieldPath: z.string().trim().min(1).max(200),
  comparator: z.nativeEnum(ValidationComparator),
  severity: z.nativeEnum(ValidationSeverity),
  tolerancePct: z.number().optional().nullable(),
  toleranceAbs: z.number().optional().nullable(),
  isActive: z.boolean().default(true)
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  const rules = await prisma.validationFieldRule.findMany({
    where: companyId ? { companyId } : undefined,
    include: { company: { select: { id: true, name: true } } },
    orderBy: [{ company: { name: "asc" } }, { createdAt: "asc" }]
  });

  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: body.data.companyId }, select: { id: true } });
  if (!company) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const rule = await prisma.validationFieldRule.create({
    data: {
      companyId: body.data.companyId,
      name: body.data.name,
      sourceDocumentType: body.data.sourceDocumentType,
      targetDocumentType: body.data.targetDocumentType,
      sourceFieldPath: body.data.sourceFieldPath,
      targetFieldPath: body.data.targetFieldPath,
      comparator: body.data.comparator,
      severity: body.data.severity,
      tolerancePct: body.data.tolerancePct ?? null,
      toleranceAbs: body.data.toleranceAbs ?? null,
      isActive: body.data.isActive
    },
    include: { company: { select: { id: true, name: true } } }
  });

  return NextResponse.json({ rule }, { status: 201 });
}
