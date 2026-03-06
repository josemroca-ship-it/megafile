import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80)
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const { id } = await params;
  const body = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const target = await prisma.company.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const name = body.data.name;
  const duplicate = await prisma.company.findFirst({
    where: {
      id: { not: id },
      name: { equals: name, mode: "insensitive" }
    }
  });
  if (duplicate) return NextResponse.json({ error: "Nombre de empresa en uso" }, { status: 409 });

  const company = await prisma.company.update({
    where: { id },
    data: { name }
  });
  return NextResponse.json({ company });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const { id } = await params;
  const target = await prisma.company.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  await prisma.company.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
