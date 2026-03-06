import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["PENDIENTE_OCR", "EN_VALIDACION", "APROBADA", "RECHAZADA"]).optional(),
  companyId: z.string().trim().min(1).optional()
}).refine((value) => value.status !== undefined || value.companyId !== undefined, {
  message: "Debe enviar al menos un campo a actualizar"
});

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.operation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });
  }

  await prisma.operation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ANALISTA") {
    return NextResponse.json({ error: "Solo ANALISTA puede actualizar estado" }, { status: 403 });
  }

  const body = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.operation.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

  if (body.data.companyId) {
    const company = await prisma.company.findUnique({ where: { id: body.data.companyId }, select: { id: true } });
    if (!company) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  const operation = await prisma.operation.update({
    where: { id },
    data: {
      ...(body.data.status ? { status: body.data.status } : {}),
      ...(body.data.companyId ? { companyId: body.data.companyId } : {})
    },
    select: { id: true, status: true, companyId: true }
  });

  return NextResponse.json({ operation });
}
