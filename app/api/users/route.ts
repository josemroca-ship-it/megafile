import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  role: z.enum(["ANALISTA", "CAPTURADOR"])
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true
    }
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const body = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { username: body.data.username } });
  if (existing) return NextResponse.json({ error: "El usuario ya existe" }, { status: 409 });

  const passwordHash = await bcrypt.hash(body.data.password, 10);
  const created = await prisma.user.create({
    data: {
      username: body.data.username,
      passwordHash,
      role: body.data.role
    },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true
    }
  });

  return NextResponse.json({ user: created }, { status: 201 });
}
