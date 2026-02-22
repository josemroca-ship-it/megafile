import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { sessionCookieName } from "@/lib/auth";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-change-me");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname === "/login-alt" || pathname === "/login-alt-vanta") {
    return NextResponse.next();
  }

  const token = req.cookies.get(sessionCookieName)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (
      (pathname.startsWith("/busqueda") ||
        pathname.startsWith("/reportes") ||
        pathname.startsWith("/usuarios") ||
        pathname.startsWith("/perfil") ||
        pathname.startsWith("/seguridad-documental")) &&
      role !== "ANALISTA"
    ) {
      return NextResponse.redirect(new URL("/operaciones", req.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image).*)"]
};
