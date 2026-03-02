import { NextResponse } from "next/server";
import { z } from "zod";
import { LANG_COOKIE, normalizeLang } from "@/lib/i18n";

const schema = z.object({
  lang: z.enum(["es", "en"])
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  const lang = normalizeLang(body.data.lang);
  const response = NextResponse.json({ ok: true, lang });
  response.cookies.set(LANG_COOKIE, lang, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365
  });

  return response;
}
