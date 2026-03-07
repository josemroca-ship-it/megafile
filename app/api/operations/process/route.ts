import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { extractDocumentData } from "@/lib/ai";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReviewThreshold } from "@/lib/review-threshold";
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
  const reviewThreshold = await getReviewThreshold();

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

  const companyPromptConfig = operation.companyId
    ? await prisma.companyAiConfig.findUnique({
        where: { companyId: operation.companyId },
        select: { extractionPrompt: true }
      })
    : null;

  const pendingDocs = operation.documents.filter((doc) => doc.extractedFields === null && doc.extractedText === null);

  for (const doc of pendingDocs) {
    const file = await fileFromStoredDocument({ fileName: doc.fileName, mimeType: doc.mimeType, storageUrl: doc.storageUrl });
    if (!file) continue;

    const extracted = await extractDocumentData(file, {
      customPrompt: companyPromptConfig?.extractionPrompt ?? null
    });

    await prisma.document.update({
      where: { id: doc.id },
      data: {
        extractedText: extracted.rawText,
        extractedFields: extracted.fields as Prisma.InputJsonValue,
        confidenceGlobal: extracted.confidenceGlobal,
        confidenceByField: extracted.confidenceByField as Prisma.InputJsonValue
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

  const lowConfidenceDocs = updatedDocs.filter((doc) => {
    const globalLow = typeof doc.confidenceGlobal === "number" ? doc.confidenceGlobal < reviewThreshold : true;
    const byField = doc.confidenceByField && typeof doc.confidenceByField === "object"
      ? Object.values(doc.confidenceByField as Record<string, unknown>).some((value) => Number(value) < reviewThreshold)
      : false;
    return globalLow || byField;
  });
  const requiresReview = lowConfidenceDocs.length > 0;
  const reviewReason = requiresReview
    ? `Confianza bajo umbral (${reviewThreshold}) en ${lowConfidenceDocs.length} documento(s).`
    : null;

  await prisma.operation.update({
    where: { id: operation.id },
    data: {
      aiSummary: summary || "Sin extracción disponible",
      status: requiresReview ? "EN_VALIDACION" : "APROBADA",
      requiresReview,
      reviewReason
    }
  });

  return NextResponse.json({ ok: true, processed: pendingDocs.length, requiresReview, threshold: reviewThreshold });
}
