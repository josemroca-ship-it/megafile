import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { extractDocumentData } from "@/lib/ai";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  operationId: z.string().min(1)
});

function parseDataUrl(url: string) {
  const match = url.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) return null;

  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || "";

  try {
    const bytes = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
    return { mimeType, bytes };
  } catch {
    return null;
  }
}

async function fileFromStoredDocument(doc: { fileName: string; mimeType: string; storageUrl: string }) {
  if (doc.storageUrl.startsWith("data:")) {
    const parsed = parseDataUrl(doc.storageUrl);
    if (!parsed) return null;
    return new File([parsed.bytes], doc.fileName, { type: parsed.mimeType || doc.mimeType });
  }

  if (doc.storageUrl.startsWith("http://") || doc.storageUrl.startsWith("https://")) {
    const response = await fetch(doc.storageUrl);
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get("content-type") || doc.mimeType || "application/octet-stream";
    return new File([bytes], doc.fileName, { type: mimeType });
  }

  return null;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "CAPTURADOR") {
    return NextResponse.json({ error: "Solo CAPTURADOR puede procesar operaciones" }, { status: 403 });
  }

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const operation = await prisma.operation.findUnique({
    where: { id: body.data.operationId },
    include: {
      documents: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!operation) {
    return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });
  }

  const pendingDocs = operation.documents.filter((doc) => doc.extractedFields === null && doc.extractedText === null);

  for (const doc of pendingDocs) {
    const file = await fileFromStoredDocument({ fileName: doc.fileName, mimeType: doc.mimeType, storageUrl: doc.storageUrl });
    if (!file) continue;

    const extracted = await extractDocumentData(file);

    await prisma.document.update({
      where: { id: doc.id },
      data: {
        extractedText: extracted.rawText,
        extractedFields: extracted.fields as Prisma.InputJsonValue
      }
    });
  }

  const updatedDocs = await prisma.document.findMany({
    where: { operationId: operation.id },
    orderBy: { createdAt: "asc" }
  });

  const summary = updatedDocs
    .map((doc) => `${doc.fileName}: ${JSON.stringify(doc.extractedFields ?? {})}`)
    .join("\n");

  await prisma.operation.update({
    where: { id: operation.id },
    data: {
      aiSummary: summary || "Sin extracción disponible"
    }
  });

  return NextResponse.json({ ok: true, processed: pendingDocs.length });
}
