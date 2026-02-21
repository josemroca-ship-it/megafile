import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { readStoredDocument } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    select: { id: true, fileName: true, mimeType: true, storageUrl: true }
  });

  if (!document) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const stored = await readStoredDocument({
    storageUrl: document.storageUrl,
    fallbackMimeType: document.mimeType
  });
  if (stored) {
    return new NextResponse(stored.bytes, {
      status: 200,
      headers: {
        "Content-Type": stored.mimeType || document.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${document.fileName}"`,
        "Cache-Control": "private, max-age=300"
      }
    });
  }

  return NextResponse.json({ error: "Formato de almacenamiento no soportado" }, { status: 400 });
}
