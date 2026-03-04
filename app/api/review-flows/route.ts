import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DOC_TYPES = ["facturas", "solicitudes", "transporte", "otros"] as const;

const rowSchema = z.object({
  documentType: z.enum(DOC_TYPES),
  requiresReview: z.boolean(),
  flowName: z.string().max(120).optional().nullable(),
  checklist: z.array(z.string().max(200)).optional().nullable()
});

const schema = z.object({
  flows: z.array(rowSchema)
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const rows = await prisma.documentReviewFlow.findMany({
    where: { documentType: { in: [...DOC_TYPES] } },
    orderBy: { documentType: "asc" }
  });

  return NextResponse.json({ flows: rows });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ANALISTA") {
    return NextResponse.json({ error: "Solo ANALISTA puede actualizar flujos de revisión" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  for (const flow of parsed.data.flows) {
    const checklist = flow.checklist && flow.checklist.length > 0 ? flow.checklist.filter(Boolean) : undefined;
    await prisma.documentReviewFlow.upsert({
      where: { documentType: flow.documentType },
      update: {
        requiresReview: flow.requiresReview,
        flowName: flow.flowName?.trim() || null,
        checklist
      },
      create: {
        documentType: flow.documentType,
        requiresReview: flow.requiresReview,
        flowName: flow.flowName?.trim() || null,
        checklist
      }
    });
  }

  const rows = await prisma.documentReviewFlow.findMany({
    where: { documentType: { in: [...DOC_TYPES] } },
    orderBy: { documentType: "asc" }
  });

  return NextResponse.json({ flows: rows });
}
