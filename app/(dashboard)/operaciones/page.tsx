import Link from "next/link";
import { FileSearch, FileText, FolderSearch, Users } from "lucide-react";
import { DeleteOperationButton } from "@/components/delete-operation-button";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Period = "today" | "7d" | "30d";

function getPeriodStart(period: Period) {
  const now = new Date();

  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const days = period === "7d" ? 7 : 30;
  const start = new Date(now);
  start.setDate(now.getDate() - days);
  return start;
}

function parsePeriod(input?: string): Period {
  if (input === "today" || input === "7d" || input === "30d") return input;
  return "30d";
}

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" }
];

export default async function OperationsPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; q?: string; page?: string }>;
}) {
  const session = await getSession();
  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const startDate = getPeriodStart(period);
  const query = (sp.q ?? "").trim();
  const take = 20;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const skip = (page - 1) * take;

  const where = {
    createdAt: { gte: startDate },
    ...(query
      ? {
          OR: [
            { clientName: { contains: query, mode: "insensitive" as const } },
            { clientRut: { contains: query, mode: "insensitive" as const } }
          ]
        }
      : {})
  };

  const [operations, totalOperations, totalDocs, uniqueClientRows] = await prisma.$transaction([
    prisma.operation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        clientName: true,
        clientRut: true,
        createdAt: true,
        _count: {
          select: {
            documents: true
          }
        }
      }
    }),
    prisma.operation.count({ where }),
    prisma.document.count({ where: { operation: where } }),
    prisma.operation.findMany({
      where,
      distinct: ["clientRut"],
      select: { clientRut: true }
    })
  ]);

  const uniqueClients = uniqueClientRows.length;
  const totalPages = Math.max(1, Math.ceil(totalOperations / take));
  const startRow = totalOperations === 0 ? 0 : skip + 1;
  const endRow = Math.min(skip + operations.length, totalOperations);

  const querySuffix = `${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  return (
    <section className="space-y-5 reveal-soft">
      <article className="bank-card p-3 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Rango del dashboard</p>
            <h2 className="font-display text-lg text-navy md:text-xl">KPIs operacionales</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => {
              const active = p.value === period;
              return (
                <Link
                  key={p.value}
                  href={`/operaciones?period=${p.value}${querySuffix}&page=1`}
                  className={
                    active
                      ? "rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                      : "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  }
                >
                  {p.label}
                </Link>
              );
            })}
          </div>
        </div>
      </article>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="bank-card hover-lift reveal p-4" style={{ animationDelay: "40ms" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Operaciones</p>
          <p className="mt-1.5 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Users size={18} className="text-cyan-600" />
            {totalOperations}
          </p>
        </article>
        <article className="bank-card hover-lift reveal p-4" style={{ animationDelay: "110ms" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Documentos</p>
          <p className="mt-1.5 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <FileText size={18} className="text-cyan-600" />
            {totalDocs}
          </p>
        </article>
        <article className="bank-card hover-lift reveal p-4" style={{ animationDelay: "180ms" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Clientes únicos</p>
          <p className="mt-1.5 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <FolderSearch size={18} className="text-cyan-600" />
            {uniqueClients}
          </p>
        </article>
      </div>

      <article className="bank-card overflow-hidden p-6 reveal" style={{ animationDelay: "220ms" }}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-navy">Operaciones registradas</h2>
            <p className="text-sm text-slate-500">Control centralizado de clientes y documentación asociada en el período seleccionado.</p>
            <p className="mt-1 text-xs text-slate-500">
              Mostrando {startRow}-{endRow} de {totalOperations} operaciones.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex items-center gap-2" method="GET" action="/operaciones">
              <input type="hidden" name="period" value={period} />
              <div className="relative">
                <FileSearch size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                <input
                  className="w-72 rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  type="search"
                  name="q"
                  placeholder="Buscar cliente o identificación..."
                  defaultValue={query}
                />
              </div>
              <button className="bank-btn-secondary text-sm" type="submit">
                Filtrar
              </button>
              {query && (
                <Link className="bank-btn-secondary text-sm" href={`/operaciones?period=${period}&page=1`}>
                  Limpiar
                </Link>
              )}
            </form>
            <Link href="/operaciones/nueva" className="bank-btn text-sm">
              Nueva operación
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="pb-3">Cliente</th>
                <th className="pb-3">Identificación</th>
                <th className="pb-3">Fecha</th>
                <th className="pb-3">Docs</th>
                <th className="pb-3">Detalle</th>
                <th className="pb-3">Búsqueda IA</th>
                <th className="pb-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((operation) => {
                return (
                  <tr key={operation.id} className="border-b border-slate-100 align-middle transition hover:bg-slate-50/70">
                    <td className="py-4 font-semibold text-slate-800">{operation.clientName}</td>
                    <td className="py-4 text-slate-700">{operation.clientRut}</td>
                    <td className="py-4 text-slate-600">{new Date(operation.createdAt).toLocaleString("es-CL")}</td>
                    <td className="py-4">
                      <span className="inline-flex min-w-10 justify-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {operation._count.documents}
                      </span>
                    </td>
                    <td className="py-4">
                      <Link className="font-semibold text-navy underline" href={`/operaciones/${operation.id}`}>
                        Abrir
                      </Link>
                    </td>
                    <td className="py-4">
                      {session?.role === "ANALISTA" ? (
                        <Link
                          className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
                          href={`/busqueda?operationId=${operation.id}`}
                        >
                          <FileSearch size={14} />
                          Buscar con IA
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">Solo analista</span>
                      )}
                    </td>
                    <td className="py-4">
                      <DeleteOperationButton operationId={operation.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalOperations > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-slate-500">
              Página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link className="bank-btn-secondary text-sm" href={`/operaciones?period=${period}${querySuffix}&page=${page - 1}`}>
                  Anterior
                </Link>
              ) : (
                <span className="rounded-xl border border-slate-200 px-4 py-2 text-slate-400">Anterior</span>
              )}
              {page < totalPages ? (
                <Link className="bank-btn-secondary text-sm" href={`/operaciones?period=${period}${querySuffix}&page=${page + 1}`}>
                  Siguiente
                </Link>
              ) : (
                <span className="rounded-xl border border-slate-200 px-4 py-2 text-slate-400">Siguiente</span>
              )}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
