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
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "CAPTURADOR") {
    return NextResponse.json({ error: "Solo CAPTURADOR puede crear operaciones" }, { status: 403 });
  }

  const form = await req.formData();
  const clientName = String(form.get("clientName") ?? "").trim();
  const clientRut = String(form.get("clientRut") ?? "").trim();
  const docs = form.getAll("documents").filter((item) => item instanceof File) as File[];
  const thumbnailsRaw = String(form.get("thumbnails") ?? "[]");
  let thumbnails: string[] = [];
  try {
    const parsed = JSON.parse(thumbnailsRaw);
    if (Array.isArray(parsed)) thumbnails = parsed.filter((item) => typeof item === "string");
  } catch {
    thumbnails = [];
  }

  if (!clientName || !clientRut || docs.length === 0) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const operation = await prisma.operation.create({
    data: {
      clientName,
      clientRut,
      aiSummary: "Procesamiento IA en curso...",
      createdById: session.userId
    }
  });

  const processed = await processWithConcurrency(docs, 3, async (file, index) => {
    const storageUrl = await uploadDocument(file);
    const providedThumbnail = thumbnails[index];
    const thumbnailUrl =
      typeof providedThumbnail === "string" && providedThumbnail.startsWith("data:image/")
        ? providedThumbnail
        : getThumbnailForDocument(file.type, storageUrl);

    await prisma.document.create({
      data: {
        operationId: operation.id,
        fileName: file.name,
        mimeType: file.type,
        storageUrl,
        thumbnailUrl
      }
    });

    return {
      fileName: file.name
    };
  });

  return NextResponse.json({
    operationId: operation.id,
    documents: processed.map((item) => ({ fileName: item.fileName, fields: {} }))
  });
}
