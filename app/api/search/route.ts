import { NextResponse } from "next/server";
import { z } from "zod";
import { answerSearchQuestion } from "@/lib/ai";
import { getSession } from "@/lib/auth";
import { findSearchMatches } from "@/lib/search";

const schema = z.object({
  question: z.string().min(3),
  operationId: z.string().min(1).optional(),
  mode: z.enum(["strict", "broad"]).optional()
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ANALISTA") {
    return NextResponse.json({ error: "Solo ANALISTA puede usar la búsqueda IA" }, { status: 403 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Pregunta inválida" }, { status: 400 });
  }

  const { topMatches, context } = await findSearchMatches({
    question: body.data.question,
    operationId: body.data.operationId,
    mode: body.data.mode
  });

  if (topMatches.length === 0) {
    return NextResponse.json({
      answer: "No encontré coincidencias relevantes en los documentos cargados para esa consulta.",
      matches: []
    });
  }

  const answer = await answerSearchQuestion({
    question: body.data.question,
    context
  });

  return NextResponse.json({
    answer,
    matches: topMatches.map(
      ({ context: _context, score: _score, matchedTokens: _matchedTokens, createdAt: _createdAt, storageUrl: _storageUrl, ...rest }) =>
        rest
    )
  });
}
