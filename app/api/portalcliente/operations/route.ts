import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getThumbnailForDocument, uploadDocument } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const fallbackUser = session
      ? null
      : await prisma.user.findFirst({
          orderBy: { createdAt: "asc" },
          select: { id: true }
        });
    const creatorUserId = session?.userId ?? fallbackUser?.id;
    if (!creatorUserId) {
      return NextResponse.json({ error: "No hay usuarios disponibles para registrar la operación" }, { status: 500 });
    }

    const form = await req.formData();
    const clientName = String(form.get("clientName") ?? "").trim();
    const clientRut = String(form.get("clientRut") ?? "").trim();
    const rawCompanyId = String(form.get("companyId") ?? "").trim();
    const rawCompanyName = String(form.get("companyName") ?? "").trim();
    const docs = form.getAll("documents").filter((item) => item instanceof File) as File[];

    if (!clientName || !clientRut || docs.length === 0) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const companyByName = rawCompanyName
      ? await prisma.company.findFirst({
          where: { name: rawCompanyName },
          select: { id: true }
        })
      : null;

    const company =
      companyByName ??
      (rawCompanyId
        ? await prisma.company.findUnique({ where: { id: rawCompanyId }, select: { id: true } })
        : await prisma.company.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } }));

    const resolvedCompany =
      company ??
      (rawCompanyName
        ? await prisma.company.create({
            data: { name: rawCompanyName },
            select: { id: true }
          })
        : null);
    if (!resolvedCompany) {
      return NextResponse.json({ error: "No hay empresa disponible para asociar la operación" }, { status: 404 });
    }

    const processed = await processWithConcurrency(docs, 3, async (file) => {
      const storageUrl = await uploadDocument(file);
      return {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        storageUrl
      };
    });

    const operation = await prisma.operation.create({
      data: {
        clientName,
        clientRut,
        companyId: resolvedCompany.id,
        aiSummary: "Procesamiento IA en curso...",
        createdById: creatorUserId
      }
    });

    await prisma.document.createMany({
      data: processed.map((doc) => ({
        operationId: operation.id,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        storageUrl: doc.storageUrl,
        thumbnailUrl: getThumbnailForDocument(doc.mimeType, doc.storageUrl)
      }))
    });

    return NextResponse.json({
      operationId: operation.id,
      documents: processed.map((item) => ({ fileName: item.fileName, fields: {} }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado al crear operación";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
