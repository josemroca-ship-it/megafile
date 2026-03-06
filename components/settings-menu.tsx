"use client";

import Link from "next/link";
import { Role } from "@prisma/client";
import { Building2, Cog, LockKeyhole, LogOut, SlidersHorizontal, UserCog, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";

export function SettingsMenu({ role, lang }: { role: Role; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);
  const copy = lang === "en"
    ? {
        openMenu: "Open settings menu",
        users: "Users",
        companies: "Companies",
        validationRules: "Validation rules",
        profile: "My profile",
        docSecurity: "Document security",
        logout: "Sign out"
      }
    : {
        openMenu: "Abrir menú de configuración",
        users: "Usuarios",
        companies: "Empresas",
        validationRules: "Reglas validación",
        profile: "Mi perfil",
        docSecurity: "Seguridad documental",
        logout: "Cerrar sesión"
      };

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="bank-btn-ghost inline-flex items-center gap-2"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={copy.openMenu}
      >
        <Cog size={16} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {role === "ANALISTA" && (
            <>
              <Link
                href="/usuarios"
                className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                <Users size={15} /> {copy.users}
              </Link>
              <Link
                href="/empresas"
                className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                <Building2 size={15} /> {copy.companies}
              </Link>
              <Link
                href="/reglas-validacion"
                className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                <SlidersHorizontal size={15} /> {copy.validationRules}
              </Link>
              <Link
                href="/perfil"
                className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                <UserCog size={15} /> {copy.profile}
              </Link>
              <Link
                href="/seguridad-documental"
                className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                <LockKeyhole size={15} /> {copy.docSecurity}
              </Link>
            </>
          )}

          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
            onClick={onLogout}
          >
            <LogOut size={15} /> {copy.logout}
          </button>
        </div>
      )}
    </div>
  );
}
