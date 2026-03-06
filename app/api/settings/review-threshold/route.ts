import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getReviewThreshold, setReviewThreshold } from "@/lib/review-threshold";

const schema = z.object({
  threshold: z.number().min(0).max(1)
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const threshold = await getReviewThreshold();
  return NextResponse.json({ threshold });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ANALISTA") {
    return NextResponse.json({ error: "Solo ANALISTA puede actualizar configuración" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const threshold = await setReviewThreshold(parsed.data.threshold);
  return NextResponse.json({ threshold });
}

