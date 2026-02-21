import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).max(100).optional()
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, role: true, createdAt: true }
  });

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== Role.ANALISTA) return NextResponse.json({ error: "Solo ANALISTA" }, { status: 403 });

  const body = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const data: { username?: string; passwordHash?: string } = {};

  if (body.data.username && body.data.username !== user.username) {
    const existing = await prisma.user.findUnique({ where: { username: body.data.username } });
    if (existing) return NextResponse.json({ error: "Nombre de usuario en uso" }, { status: 409 });
    data.username = body.data.username;
  }

  if (body.data.newPassword) {
    if (!body.data.currentPassword) {
      return NextResponse.json({ error: "Debes indicar la contraseña actual" }, { status: 400 });
    }
    const ok = await bcrypt.compare(body.data.currentPassword, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 401 });
    data.passwordHash = await bcrypt.hash(body.data.newPassword, 10);
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data,
    select: { id: true, username: true, role: true, createdAt: true }
  });

  return NextResponse.json({ user: updated });
}
