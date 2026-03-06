import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80)
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true }
  });
  return NextResponse.json({ companies });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const body = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const name = body.data.name;
  const exists = await prisma.company.findFirst({
    where: { name: { equals: name, mode: "insensitive" } }
  });
  if (exists) return NextResponse.json({ error: "La empresa ya existe" }, { status: 409 });

  const company = await prisma.company.create({ data: { name } });
  return NextResponse.json({ company }, { status: 201 });
}
