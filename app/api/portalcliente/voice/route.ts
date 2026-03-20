import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(1200),
  voice: z.string().trim().min(1).max(64).optional()
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido para síntesis de voz." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY no configurada." }, { status: 503 });
  }

  const model = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
  const voice = parsed.data.voice || process.env.OPENAI_TTS_VOICE || "alloy";
  const rawSpeed = Number(process.env.OPENAI_TTS_SPEED || "1.08");
  const speed = Number.isFinite(rawSpeed) ? Math.min(1.2, Math.max(0.9, rawSpeed)) : 1.08;

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        voice,
        input: parsed.data.text,
        format: "mp3",
        speed
      })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json(
        {
          error: "No fue posible sintetizar audio.",
          detail: detail.slice(0, 300)
        },
        { status: 502 }
      );
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado en síntesis.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
