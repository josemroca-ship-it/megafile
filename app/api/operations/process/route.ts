import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { extractDocumentData } from "@/lib/ai";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readStoredDocument } from "@/lib/storage";

export const runtime = "nodejs";

const schema = z.object({
  operationId: z.string().min(1)
});

async function fileFromStoredDocument(doc: { fileName: string; mimeType: string; storageUrl: string }) {
  const stored = await readStoredDocument({
    storageUrl: doc.storageUrl,
    fallbackMimeType: doc.mimeType
  });
  if (!stored) return null;
  return new File([stored.bytes], doc.fileName, { type: stored.mimeType });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

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
