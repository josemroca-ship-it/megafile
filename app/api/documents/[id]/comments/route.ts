import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  text: z.string().min(1).max(2000)
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const comments = await prisma.documentComment.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      authorName: true,
      text: true,
      createdAt: true
    }
  });

  return NextResponse.json({ comments });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Comentario inválido" }, { status: 400 });
  }

  const exists = await prisma.document.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const created = await prisma.documentComment.create({
    data: {
      documentId: id,
      authorId: session.userId,
      authorName: session.username,
      text: parsed.data.text.trim()
    },
    select: {
      id: true,
      authorName: true,
      text: true,
      createdAt: true
    }
  });

  return NextResponse.json({ comment: created }, { status: 201 });
}
