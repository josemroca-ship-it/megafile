"use client";

import Link from "next/link";
import { Role } from "@prisma/client";
import { Cog, LogOut, UserCog, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function SettingsMenu({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);

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
        aria-label="Abrir menú de configuración"
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
                <Users size={15} /> Usuarios
              </Link>
              <Link
                href="/perfil"
                className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                <UserCog size={15} /> Mi perfil
              </Link>
            </>
          )}

          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
            onClick={onLogout}
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
