"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
  const lang = useMemo(() => (typeof document !== "undefined" && document.cookie.includes("megafyle_lang=en") ? "en" : "es"), []);
  const t = lang === "en"
    ? {
        confirm: "Are you sure you want to delete this operation? This action cannot be undone.",
        error: "Unable to delete operation.",
        deleting: "Deleting...",
        deleteOperation: "Delete operation",
        delete: "Delete"
      }
    : {
        confirm: "¿Seguro que deseas eliminar esta operación? Esta acción no se puede deshacer.",
        error: "No fue posible eliminar la operación.",
        deleting: "Eliminando...",
        deleteOperation: "Eliminar operación",
        delete: "Eliminar"
      };

  async function onDelete() {
    if (!confirm(t.confirm)) {
      return;
    }

    setLoading(true);
    const response = await fetch(`/api/operations/${operationId}`, { method: "DELETE" });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      alert(data?.error ?? t.error);
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
      title={loading ? t.deleting : t.deleteOperation}
      aria-label={loading ? t.deleting : t.deleteOperation}
    >
      <Trash2 size={16} />
      {!iconOnly && (loading ? t.deleting : t.delete)}
    </button>
  );
}
