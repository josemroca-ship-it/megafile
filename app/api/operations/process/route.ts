import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { detectDocumentSignatureWithAI, extractDocumentData } from "@/lib/ai";
import { getSession } from "@/lib/auth";
import { detectSignatureHints, scanPii } from "@/lib/pii";
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
        select: { extractionPrompt: true, extractionProvider: true, extractionModel: true }
      })
    : null;

  const docsToEvaluate = operation.documents;
  const docsNeedingExtraction = operation.documents.filter((doc) => doc.extractedFields === null && doc.extractedText === null);

  for (const doc of docsToEvaluate) {
    const file = await fileFromStoredDocument({ fileName: doc.fileName, mimeType: doc.mimeType, storageUrl: doc.storageUrl });
    let extractedText = doc.extractedText ?? "";
    let extractedFields: Record<string, unknown> = (doc.extractedFields as Record<string, unknown> | null) ?? {};
    let confidenceGlobal = doc.confidenceGlobal;
    let confidenceByField = (doc.confidenceByField as Record<string, number> | null) ?? {};

    if (doc.extractedFields === null && doc.extractedText === null) {
      if (!file) continue;
      const extracted = await extractDocumentData(file, {
        customPrompt: companyPromptConfig?.extractionPrompt ?? null,
        provider: (companyPromptConfig?.extractionProvider as "openai" | "gemini" | null | undefined) ?? null,
        model: companyPromptConfig?.extractionModel ?? null
      });
      extractedText = extracted.rawText;
      extractedFields = extracted.fields;
      confidenceGlobal = extracted.confidenceGlobal;
      confidenceByField = extracted.confidenceByField;
    }

    const piiScan = scanPii(`${extractedText ?? ""}\n${JSON.stringify(extractedFields ?? {})}`);
    const signatureScan = detectSignatureHints({
      rawText: extractedText,
      extractedFields,
      fileName: doc.fileName
    });
    let aiSignature: Awaited<ReturnType<typeof detectDocumentSignatureWithAI>> | null = null;
    if (file) {
      try {
        aiSignature = await detectDocumentSignatureWithAI(file, {
          provider: (companyPromptConfig?.extractionProvider as "openai" | "gemini" | null | undefined) ?? null,
          model: companyPromptConfig?.extractionModel ?? null
        });
      } catch {
        aiSignature = null;
      }
    }
    const signatureHints = Array.from(
      new Set([
        ...signatureScan.hints,
        ...(aiSignature?.evidence ?? []),
        aiSignature?.confidence !== null && aiSignature?.confidence !== undefined
          ? `ai_signature_confidence:${Math.round(aiSignature.confidence * 100)}%`
          : null,
        aiSignature ? `ai_signature:${aiSignature.hasSignature ? "yes" : "no"}` : null
      ].filter(Boolean) as string[])
    );
    const hasSignature = signatureScan.hasSignature || Boolean(aiSignature?.hasSignature);

    await prisma.document.update({
      where: { id: doc.id },
      data: {
        extractedText: extractedText ?? null,
        extractedFields: extractedFields as Prisma.InputJsonValue,
        hasPii: piiScan.hasPii,
        piiDetections: piiScan.detections as Prisma.InputJsonValue,
        hasSignature,
        signatureHints: signatureHints as Prisma.InputJsonValue,
        confidenceGlobal,
        confidenceByField: confidenceByField as Prisma.InputJsonValue
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

  return NextResponse.json({
    ok: true,
    processed: docsToEvaluate.length,
    extracted: docsNeedingExtraction.length,
    requiresReview,
    threshold: reviewThreshold
  });
}
