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
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (session.role !== "CAPTURADOR") {
      return NextResponse.json({ error: "Solo CAPTURADOR puede crear operaciones" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    let clientName = "";
    let clientRut = "";
    let processed: Array<{ fileName: string; mimeType?: string; storageUrl?: string }> = [];

    if (isJson) {
      const body = (await req.json().catch(() => null)) as
        | {
            clientName?: string;
            clientRut?: string;
            documents?: Array<{ fileName?: string; mimeType?: string; storageUrl?: string }>;
          }
        | null;

      clientName = String(body?.clientName ?? "").trim();
      clientRut = String(body?.clientRut ?? "").trim();
      const docs = (body?.documents ?? []).filter(
        (doc) => doc?.fileName && doc?.mimeType && doc?.storageUrl
      ) as Array<{ fileName: string; mimeType: string; storageUrl: string }>;

      if (!clientName || !clientRut || docs.length === 0) {
        return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
      }
      processed = docs;
    } else {
      const form = await req.formData();
      clientName = String(form.get("clientName") ?? "").trim();
      clientRut = String(form.get("clientRut") ?? "").trim();
      const docs = form.getAll("documents").filter((item) => item instanceof File) as File[];

      if (!clientName || !clientRut || docs.length === 0) {
        return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
      }
      processed = await processWithConcurrency(docs, 3, async (file) => {
        const storageUrl = await uploadDocument(file);
        return {
          fileName: file.name,
          mimeType: file.type,
          storageUrl
        };
      });
    }

    const operation = await prisma.operation.create({
      data: {
        clientName,
        clientRut,
        aiSummary: "Procesamiento IA en curso...",
        createdById: session.userId
      }
    });

    await prisma.document.createMany({
      data: processed.map((doc) => ({
        operationId: operation.id,
        fileName: doc.fileName,
        mimeType: doc.mimeType || "application/octet-stream",
        storageUrl: doc.storageUrl || "",
        thumbnailUrl: getThumbnailForDocument(doc.mimeType || "application/octet-stream", doc.storageUrl || "")
      }))
    });

    return NextResponse.json({
      operationId: operation.id,
      documents: processed.map((item) => ({ fileName: item.fileName, fields: {} }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado al crear la operación";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
