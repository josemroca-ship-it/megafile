"use client";

import Link from "next/link";
import { Role } from "@prisma/client";
import { ChartColumnBig, Home, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { SettingsMenu } from "@/components/settings-menu";

export function TopNav({ role, username }: { role: Role; username: string }) {
  const pathname = usePathname();

  function navClass(active: boolean) {
    if (active) {
      return "inline-flex items-center gap-2 rounded-xl border border-cyan-300 bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-800";
    }
    return "bank-btn-ghost inline-flex items-center gap-2";
  }

  return (
    <header className="bank-shell relative z-40 mb-7 px-5 py-5 md:px-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <img src="/megafy-logo.png" alt="Megafy" className="h-10 w-auto" />
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/70 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
            <Sparkles size={14} />
            Operaciones asistidas por IA
          </div>
          <h1 className="font-display text-2xl text-slate-900 md:text-3xl">Megafyle: conocimiento documental a un prompt</h1>
          <p className="text-sm text-slate-600">
            <ShieldCheck className="mr-1 inline-block" size={16} />
            Usuario <strong>{username}</strong> · Rol <strong>{role}</strong>
          </p>
        </div>

        <div className="flex w-full items-center justify-end gap-2 md:w-auto">
          <nav className="flex flex-wrap items-center gap-2">
            <Link className={navClass(pathname === "/operaciones")} href="/operaciones">
              <Home size={16} />
              Inicio
            </Link>
            <Link className={navClass(pathname.startsWith("/operaciones/nueva"))} href="/operaciones/nueva">
              Añadir operación
            </Link>
            {role === "ANALISTA" && (
              <>
                <Link className={navClass(pathname.startsWith("/busqueda"))} href="/busqueda">
                  <ScanSearch size={16} />
                  Búsqueda IA
                  <Sparkles size={14} className="text-cyan-600" />
                </Link>
                <Link className={navClass(pathname.startsWith("/reportes"))} href="/reportes">
                  <ChartColumnBig size={16} />
                  Reportes IA
                </Link>
              </>
            )}
          </nav>
          <SettingsMenu role={role} />
        </div>
      </div>
      <div className="glow-line mt-5" />
    </header>
  );
}
