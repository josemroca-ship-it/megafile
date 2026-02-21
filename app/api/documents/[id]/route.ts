import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) return null;

  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || "";

  try {
    const buffer = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
    return { mimeType, buffer };
  } catch {
    return null;
  }
}

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

  if (document.storageUrl.startsWith("http://") || document.storageUrl.startsWith("https://")) {
    return NextResponse.redirect(document.storageUrl);
  }

  if (document.storageUrl.startsWith("data:")) {
    const decoded = decodeDataUrl(document.storageUrl);
    if (!decoded) {
      return NextResponse.json({ error: "Documento inválido" }, { status: 400 });
    }

    return new NextResponse(decoded.buffer, {
      status: 200,
      headers: {
        "Content-Type": decoded.mimeType || document.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${document.fileName}"`,
        "Cache-Control": "private, max-age=300"
      }
    });
  }

  return NextResponse.json({ error: "Formato de almacenamiento no soportado" }, { status: 400 });
}
