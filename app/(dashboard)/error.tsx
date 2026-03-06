"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { isDbUnavailableError } from "@/lib/db-errors";

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string; code?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const dbDown = isDbUnavailableError(error);

  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-4xl items-center justify-center p-6">
      <section className="bank-card w-full p-8 text-center">
        <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle size={18} />
        </div>
        <h1 className="font-display text-2xl text-navy">
          {dbDown ? "Mantenimiento temporal de base de datos" : "No fue posible cargar la información"}
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
          {dbDown
            ? "El sistema está en modo degradado por mantenimiento de la base de datos. Intenta nuevamente en unos minutos."
            : "Ocurrió un error inesperado. Puedes reintentar ahora."}
        </p>
        <button
          type="button"
          className="bank-btn mt-6 inline-flex items-center gap-2"
          onClick={() => reset()}
        >
          <RefreshCcw size={16} />
          Reintentar
        </button>
      </section>
    </main>
  );
}

