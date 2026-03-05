import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  extractedFields: z.record(z.any())
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const existing = await prisma.document.findUnique({
    where: { id },
    select: { id: true, operation: { select: { createdById: true } } }
  });

  if (!existing) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  if (session.role !== "ANALISTA" && existing.operation.createdById !== session.userId) {
    return NextResponse.json({ error: "No autorizado para editar este documento" }, { status: 403 });
  }

  const updated = await prisma.document.update({
    where: { id },
    data: { extractedFields: parsed.data.extractedFields },
    select: { id: true, extractedFields: true }
  });

  return NextResponse.json({ documentId: updated.id, extractedFields: updated.extractedFields });
}
