"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteOperationButton({
  operationId,
  redirectTo,
  iconOnly = false
}: {
  operationId: string;
  redirectTo?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("¿Seguro que deseas eliminar esta operación? Esta acción no se puede deshacer.")) {
      return;
    }

    setLoading(true);
    const response = await fetch(`/api/operations/${operationId}`, { method: "DELETE" });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      alert(data?.error ?? "No fue posible eliminar la operación.");
      setLoading(false);
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
    }
    router.refresh();
  }

  return (
    <button
      className={`bank-btn-danger inline-flex items-center ${iconOnly ? "justify-center px-3 py-2" : "gap-2 text-sm"}`}
      onClick={onDelete}
      disabled={loading}
      title={loading ? "Eliminando..." : "Eliminar operación"}
      aria-label={loading ? "Eliminando operación" : "Eliminar operación"}
    >
      <Trash2 size={16} />
      {!iconOnly && (loading ? "Eliminando..." : "Eliminar")}
    </button>
  );
}
