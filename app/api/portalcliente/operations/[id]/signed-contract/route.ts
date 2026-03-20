import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getThumbnailForDocument, uploadDocument } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("file");
  const signedAt = String(form.get("signedAt") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Debe enviar un archivo PDF firmado" }, { status: 400 });
  }

  const operation = await prisma.operation.findUnique({
    where: { id },
    select: { id: true, clientName: true, clientRut: true }
  });
  if (!operation) {
    return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });
  }

  const storageUrl = await uploadDocument(file);
  const mimeType = file.type || "application/pdf";
  const signatureHints = ["signed_contract", "firma_paciente", signedAt ? `signed_at:${signedAt}` : null].filter(
    (value): value is string => Boolean(value)
  );

  const document = await prisma.document.create({
    data: {
      operationId: operation.id,
      fileName: file.name || "contrato-preadmision-firmado.pdf",
      mimeType,
      storageUrl,
      thumbnailUrl: getThumbnailForDocument(mimeType, storageUrl),
      hasSignature: true,
      signatureHints,
      extractedFields: {
        tipo_documento: "contrato_preadmision_firmado",
        paciente: operation.clientName,
        rut_paciente: operation.clientRut,
        firmado_en: signedAt || null
      }
    },
    select: { id: true, fileName: true }
  });

  return NextResponse.json({ ok: true, document });
}
