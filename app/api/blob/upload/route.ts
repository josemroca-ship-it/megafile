import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "CAPTURADOR") {
    return NextResponse.json({ error: "Solo CAPTURADOR puede subir documentos" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.userId })
        };
      },
      onUploadCompleted: async () => {
        // No-op: el registro final del documento se hace en /api/operations
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible generar token de subida";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

