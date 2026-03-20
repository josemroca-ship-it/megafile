import { Prisma } from "@prisma/client";
import { detectDocumentSignatureWithAI, extractDocumentData } from "@/lib/ai";
import { detectSignatureHints, scanPii } from "@/lib/pii";
import { prisma } from "@/lib/prisma";
import { getReviewThreshold } from "@/lib/review-threshold";
import { decryptSecret } from "@/lib/secrets";
import { readStoredDocument } from "@/lib/storage";

async function processWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
) {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

async function fileFromStoredDocument(doc: { fileName: string; mimeType: string; storageUrl: string }) {
  const stored = await readStoredDocument({
    storageUrl: doc.storageUrl,
    fallbackMimeType: doc.mimeType
  });
  if (!stored) return null;
  return new File([stored.bytes], doc.fileName, { type: stored.mimeType });
}

export async function processOperationById(operationId: string) {
  return processOperationByIdWithOptions(operationId);
}

export async function processOperationByIdWithOptions(
  operationId: string,
  options?: {
    skipSignatureAi?: boolean;
  }
) {
  const reviewThreshold = await getReviewThreshold();

  const operation = await prisma.operation.findUnique({
    where: { id: operationId },
    include: {
      documents: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!operation) {
    throw new Error("Operación no encontrada");
  }

  const companyPromptConfig = operation.companyId
    ? await prisma.companyAiConfig.findUnique({
        where: { companyId: operation.companyId },
        select: {
          extractionPrompt: true,
          extractionProvider: true,
          extractionModel: true,
          openaiApiKey: true,
          geminiApiKey: true,
          anthropicApiKey: true
        }
      })
    : null;

  const docsToEvaluate = operation.documents;
  const docsNeedingExtraction = operation.documents.filter((doc) => doc.extractedFields === null && doc.extractedText === null);

  await processWithConcurrency(docsToEvaluate, 2, async (doc) => {
    const file = await fileFromStoredDocument({ fileName: doc.fileName, mimeType: doc.mimeType, storageUrl: doc.storageUrl });
    let extractedText = doc.extractedText ?? "";
    let extractedFields: Record<string, unknown> = (doc.extractedFields as Record<string, unknown> | null) ?? {};
    let confidenceGlobal = doc.confidenceGlobal;
    let confidenceByField = (doc.confidenceByField as Record<string, number> | null) ?? {};

    if (doc.extractedFields === null && doc.extractedText === null) {
      if (!file) return;
      const extracted = await extractDocumentData(file, {
        customPrompt: companyPromptConfig?.extractionPrompt ?? null,
        provider: (companyPromptConfig?.extractionProvider as "openai" | "gemini" | "anthropic" | null | undefined) ?? null,
        model: companyPromptConfig?.extractionModel ?? null,
        apiKeys: {
          openaiApiKey: companyPromptConfig?.openaiApiKey ? decryptSecret(companyPromptConfig.openaiApiKey) : null,
          geminiApiKey: companyPromptConfig?.geminiApiKey ? decryptSecret(companyPromptConfig.geminiApiKey) : null,
          anthropicApiKey: companyPromptConfig?.anthropicApiKey ? decryptSecret(companyPromptConfig.anthropicApiKey) : null
        }
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
    if (file && !options?.skipSignatureAi) {
      try {
        aiSignature = await detectDocumentSignatureWithAI(file, {
          provider: (companyPromptConfig?.extractionProvider as "openai" | "gemini" | "anthropic" | null | undefined) ?? null,
          model: companyPromptConfig?.extractionModel ?? null,
          apiKeys: {
            openaiApiKey: companyPromptConfig?.openaiApiKey ? decryptSecret(companyPromptConfig.openaiApiKey) : null,
            geminiApiKey: companyPromptConfig?.geminiApiKey ? decryptSecret(companyPromptConfig.geminiApiKey) : null,
            anthropicApiKey: companyPromptConfig?.anthropicApiKey ? decryptSecret(companyPromptConfig.anthropicApiKey) : null
          }
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

    const updated = await prisma.document.updateMany({
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

    // If the record disappeared (e.g. concurrent deletion), skip without failing the full operation.
    if (updated.count === 0) return;
  });

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

  return {
    ok: true,
    processed: docsToEvaluate.length,
    extracted: docsNeedingExtraction.length,
    requiresReview,
    threshold: reviewThreshold
  };
}
