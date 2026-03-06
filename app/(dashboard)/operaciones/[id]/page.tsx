import { notFound } from "next/navigation";
import { DeleteOperationButton } from "@/components/delete-operation-button";
import { OperationDetailView } from "@/components/operation-detail-view";
import { getRequestLang } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function OperationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getRequestLang();

  const operation = await prisma.operation.findUnique({
    where: { id },
    include: { documents: { orderBy: { createdAt: "asc" } } }
  });

  if (!operation) notFound();

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <DeleteOperationButton operationId={operation.id} redirectTo="/operaciones" />
      </div>

      <OperationDetailView
        lang={lang}
        operation={{
          id: operation.id,
          clientName: operation.clientName,
          clientRut: operation.clientRut,
          status: operation.status,
          requiresReview: operation.requiresReview,
          reviewReason: operation.reviewReason,
          createdAt: operation.createdAt.toISOString(),
          documents: operation.documents.map((doc) => ({
            id: doc.id,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            thumbnailUrl: doc.thumbnailUrl,
            storageUrl: doc.storageUrl,
            extractedText: doc.extractedText,
            extractedFields: doc.extractedFields,
            confidenceGlobal: doc.confidenceGlobal,
            confidenceByField: doc.confidenceByField
          }))
        }}
      />
    </section>
  );
}
