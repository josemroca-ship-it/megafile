import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
