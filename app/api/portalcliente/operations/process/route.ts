import { NextResponse } from "next/server";
import { z } from "zod";
import { processOperationByIdWithOptions } from "@/lib/operations-process";

export const runtime = "nodejs";

const schema = z.object({
  operationId: z.string().min(1)
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  try {
    const result = await processOperationByIdWithOptions(body.data.operationId, {
      skipSignatureAi: true
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado al procesar operación";
    if (message === "Operación no encontrada") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
