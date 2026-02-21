import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const session = await authenticate(body.username, body.password);

    if (!session) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, role: session.role });
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
}
