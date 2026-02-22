import { Check, FileText, LockKeyhole, Shield, Truck, FileSignature, FileQuestion, type LucideIcon } from "lucide-react";

type DocType = {
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

type GroupDef = {
  key: string;
  label: string;
  color: string;
};

const docTypes: DocType[] = [
  {
    key: "facturas",
    label: "Facturas",
    icon: FileText,
    description: "Comprobantes tributarios y facturación."
  },
  {
    key: "solicitudes",
    label: "Solicitudes",
    icon: FileSignature,
    description: "Formularios y solicitudes de clientes."
  },
  {
    key: "transporte",
    label: "Doc. de transporte",
    icon: Truck,
    description: "Guías, cartas de porte y respaldos logísticos."
  },
  {
    key: "otros",
    label: "Otros",
    icon: FileQuestion,
    description: "Documentación no categorizada."
  }
];

const groups: GroupDef[] = [
  { key: "operador", label: "Operador", color: "bg-cyan-50 text-cyan-800 border-cyan-200" },
  { key: "analista", label: "Analista", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { key: "auditoria", label: "Auditoría", color: "bg-amber-50 text-amber-800 border-amber-200" }
];

const demoMatrix: Record<string, Record<string, boolean>> = {
  operador: { facturas: true, solicitudes: true, transporte: false, otros: false },
  analista: { facturas: true, solicitudes: true, transporte: true, otros: true },
  auditoria: { facturas: true, solicitudes: true, transporte: true, otros: false }
};

export default function SeguridadDocumentalPage() {
  return (
    <section className="space-y-6">
      <article className="bank-card p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
              <LockKeyhole size={14} />
              Seguridad documental
            </div>
            <h2 className="mt-3 font-display text-3xl text-slate-900">Control de acceso por tipo de documento</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Define qué grupos de usuarios pueden acceder a cada categoría documental para reforzar el gobierno y la seguridad de la
              información.
            </p>
          </div>
        </div>
      </article>

      <article className="bank-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Shield size={16} className="text-cyan-700" />
            Matriz de permisos por grupo
          </div>
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500"
          >
            Guardar configuración
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Grupo</th>
                  {docTypes.map((doc) => (
                    <th key={doc.key} className="px-4 py-3 text-left font-semibold">
                      {doc.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.key} className="border-t border-slate-100">
                    <td className="px-4 py-4 align-top">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${group.color}`}>
                        {group.label}
                      </span>
                    </td>
                    {docTypes.map((doc) => {
                      const enabled = demoMatrix[group.key]?.[doc.key] ?? false;
                      return (
                        <td key={`${group.key}-${doc.key}`} className="px-4 py-4 align-top">
                          <label className="inline-flex items-center gap-2 text-slate-700">
                            <input
                              type="checkbox"
                              checked={enabled}
                              readOnly
                              disabled
                              className="h-4 w-4 cursor-not-allowed rounded border-slate-300 text-cyan-600"
                            />
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                              {enabled ? <Check size={13} className="text-emerald-600" /> : null}
                              {enabled ? "Permitido" : "Restringido"}
                            </span>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </article>

      <article className="grid gap-4 md:grid-cols-2">
        <div className="bank-card p-5">
          <h3 className="text-sm font-semibold text-slate-900">Tipos de documento soportados</h3>
          <div className="mt-4 grid gap-3">
            {docTypes.map((doc) => {
              const Icon = doc.icon;
              return (
                <div key={doc.key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-cyan-700">
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{doc.label}</p>
                    <p className="text-xs text-slate-500">{doc.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bank-card p-5">
          <h3 className="text-sm font-semibold text-slate-900">Capacidades de control documental</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              Reglas por rol, grupo y unidad de negocio.
            </li>
            <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              Excepciones por operación, cliente o tipo documental.
            </li>
            <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              Auditoría de accesos y trazabilidad por usuario.
            </li>
            <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              Integración con clasificación automática por IA.
            </li>
          </ul>
        </div>
      </article>
    </section>
  );
}
