import { NextResponse } from "next/server";
import { Role, ValidationDocumentType, ValidationRuleKey, ValidationSeverity } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  ruleKey: z.nativeEnum(ValidationRuleKey),
  documentType: z.nativeEnum(ValidationDocumentType).default(ValidationDocumentType.ALL),
  severity: z.nativeEnum(ValidationSeverity).default(ValidationSeverity.ERROR),
  isActive: z.boolean().default(true),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  const rules = await prisma.validationRule.findMany({
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

  const body = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: body.data.companyId }, select: { id: true } });
  if (!company) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const rule = await prisma.validationRule.create({
    data: {
      companyId: body.data.companyId,
      name: body.data.name,
      ruleKey: body.data.ruleKey,
      documentType: body.data.documentType,
      severity: body.data.severity,
      isActive: body.data.isActive,
      config: body.data.config ?? undefined
    },
    include: { company: { select: { id: true, name: true } } }
  });

  return NextResponse.json({ rule }, { status: 201 });
}
