"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteOperationButton({
  operationId,
  redirectTo
}: {
  operationId: string;
  redirectTo?: string;
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
    <button className="bank-btn-danger inline-flex items-center gap-2 text-sm" onClick={onDelete} disabled={loading}>
      <Trash2 size={16} />
      {loading ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
