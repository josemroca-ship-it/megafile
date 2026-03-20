import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  patientName: z.string().trim().min(1).optional(),
  patientRut: z.string().trim().min(1).optional()
});

function normalized(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, unknown>;
  return value as Record<string, unknown>;
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function findRutInText(input: string) {
  const match = input.match(/\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/);
  return match?.[0]?.trim() || "";
}

function findDoctorInText(input: string) {
  const patterns = [
    /(?:dr\.?|dra\.?|doctor(?:a)?(?:\s+tratante)?)\s*[:\-]?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{4,80})/i,
    /firma(?:\s+medico|\s+doctor)?\s*[:\-]?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{4,80})/i
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return "";
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const { id } = await params;

  const operation = await prisma.operation.findUnique({
    where: { id },
    select: {
      id: true,
      documents: {
        select: { id: true, fileName: true, extractedFields: true, extractedText: true },
        orderBy: { createdAt: "asc" }
      },
      clientName: true,
      clientRut: true
    }
  });
  if (!operation) {
    return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });
  }

  const identityDocument =
    operation.documents.find((doc) => {
      const fields = toObject(doc.extractedFields);
      const docType = normalized(
        pickString(fields.tipo_documento, fields.document_type, fields.tipoDocumento)
      );
      const name = normalized(doc.fileName);
      return docType.includes("identidad") || docType.includes("cedula") || docType.includes("dni") || name.includes("cedula") || name.includes("identidad");
    }) ?? null;

  const identityFields = toObject(identityDocument?.extractedFields);
  const identityRelevantFields = toObject(identityFields.campos_relevantes);
  const identityName = pickString(
    identityRelevantFields.nombre_paciente,
    identityRelevantFields.nombre,
    identityFields.nombre_paciente,
    identityFields.patient_name
  );
  const identityRut = pickString(
    identityRelevantFields.rut_paciente,
    identityRelevantFields.rut,
    identityFields.rut_paciente,
    identityFields.rut,
    findRutInText(identityDocument?.extractedText ?? "")
  );

  const appliedPatientName = pickString(body.data.patientName, identityName, operation.clientName);
  const appliedPatientRut = pickString(body.data.patientRut, identityRut, operation.clientRut);

  const orderDocument =
    operation.documents.find((doc) => {
      const name = normalized(doc.fileName);
      const fields = toObject(doc.extractedFields);
      const docType = normalized(
        pickString(fields.tipo_documento, fields.document_type, fields.tipoDocumento)
      );
      return docType.includes("orden_hospitalizacion") || docType.includes("hospitalizacion") || (name.includes("orden") && name.includes("hospital"));
    }) ?? operation.documents[0];

  if (!orderDocument) {
    return NextResponse.json({ error: "No hay documentos para enriquecer" }, { status: 404 });
  }

  const existingOrderFields = toObject(orderDocument.extractedFields);
  const existingRelevant = toObject(existingOrderFields.campos_relevantes);
  const doctorName = pickString(
    existingRelevant.doctor_firmante,
    existingRelevant.medico_tratante,
    existingOrderFields.doctor_firmante,
    existingOrderFields.medico_tratante,
    findDoctorInText(orderDocument.extractedText ?? "")
  );

  const camposRelevantes = {
    ...existingRelevant,
    tipo_documento: "orden_hospitalizacion",
    nombre_paciente: appliedPatientName || existingRelevant.nombre_paciente || null,
    rut_paciente: appliedPatientRut || existingRelevant.rut_paciente || null,
    doctor_firmante: doctorName || existingRelevant.doctor_firmante || null,
    medico_tratante: doctorName || existingRelevant.medico_tratante || null
  };

  const extractedFields = {
    ...existingOrderFields,
    tipo_documento: "orden_hospitalizacion",
    nombre_paciente: appliedPatientName || existingOrderFields.nombre_paciente || null,
    rut_paciente: appliedPatientRut || existingOrderFields.rut_paciente || null,
    doctor_firmante: doctorName || existingOrderFields.doctor_firmante || null,
    medico_tratante: doctorName || existingOrderFields.medico_tratante || null,
    campos_relevantes: camposRelevantes
  };

  await prisma.document.update({
    where: { id: orderDocument.id },
    data: {
      extractedFields,
      extractedText: [
        orderDocument.extractedText || "Orden de hospitalizacion",
        `Paciente: ${appliedPatientName || "No detectado"}`,
        `RUT: ${appliedPatientRut || "No detectado"}`,
        doctorName ? `Doctor firmante: ${doctorName}` : null
      ]
        .filter(Boolean)
        .join("\n"),
      hasPii: Boolean(appliedPatientRut)
    }
  });

  return NextResponse.json({
    ok: true,
    documentId: orderDocument.id,
    extractedFields,
    identityDocumentId: identityDocument?.id ?? null,
    appliedPatientName: appliedPatientName || null,
    appliedPatientRut: appliedPatientRut || null
  });
}
