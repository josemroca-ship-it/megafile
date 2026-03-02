import Link from "next/link";
import { FileSearch, FileText, FolderSearch, Users } from "lucide-react";
import { DeleteOperationButton } from "@/components/delete-operation-button";
import { getSession } from "@/lib/auth";
import { getRequestLang } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

type Period = "today" | "7d" | "30d";
type Company = "Banco" | "Aseguradora" | "Gestora";

const COMPANIES: Company[] = ["Banco", "Aseguradora", "Gestora"];

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

const PERIODS: Array<{ value: Period }> = [{ value: "today" }, { value: "7d" }, { value: "30d" }];

function companyForOperation(id: string): Company {
  const seed = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return COMPANIES[seed % COMPANIES.length];
}

export default async function OperationsPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; q?: string; page?: string }>;
}) {
  const session = await getSession();
  const lang = await getRequestLang();
  const t =
    lang === "en"
      ? {
          periods: { today: "Today", "7d": "7 days", "30d": "30 days" },
          range: "Dashboard range",
          kpis: "Operational KPIs",
          operations: "Operations",
          documents: "Documents",
          uniqueClients: "Unique clients",
          opsRegistered: "Registered operations",
          opsSubtitle: "Centralized control of clients and related documents for the selected period.",
          showing: "Showing",
          of: "of",
          company: "Company",
          all: "All",
          visualSeg: "Multi-entity visual segmentation",
          client: "Client",
          identification: "Identification",
          date: "Date",
          docs: "Docs",
          detail: "Detail",
          aiSearch: "AI Search",
          action: "Action",
          open: "Open",
          searchWithAi: "Search with AI",
          analystOnly: "Analyst only",
          page: "Page",
          previous: "Previous",
          next: "Next",
          searchPlaceholder: "Search client or identification...",
          filter: "Filter",
          clear: "Clear",
          newOperation: "New operation"
        }
      : {
          periods: { today: "Hoy", "7d": "7 días", "30d": "30 días" },
          range: "Rango del dashboard",
          kpis: "KPIs operacionales",
          operations: "Operaciones",
          documents: "Documentos",
          uniqueClients: "Clientes únicos",
          opsRegistered: "Operaciones registradas",
          opsSubtitle: "Control centralizado de clientes y documentación asociada en el período seleccionado.",
          showing: "Mostrando",
          of: "de",
          company: "Empresa",
          all: "Todas",
          visualSeg: "Segmentación visual multientidad",
          client: "Cliente",
          identification: "Identificación",
          date: "Fecha",
          docs: "Docs",
          detail: "Detalle",
          aiSearch: "Búsqueda IA",
          action: "Acción",
          open: "Abrir",
          searchWithAi: "Buscar con IA",
          analystOnly: "Solo analista",
          page: "Página",
          previous: "Anterior",
          next: "Siguiente",
          searchPlaceholder: "Buscar cliente o identificación...",
          filter: "Filtrar",
          clear: "Limpiar",
          newOperation: "Nueva operación"
        };
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t.range}</p>
            <h2 className="font-display text-lg text-navy md:text-xl">{t.kpis}</h2>
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
                  {t.periods[p.value]}
                </Link>
              );
            })}
          </div>
        </div>
      </article>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="bank-card hover-lift reveal p-4" style={{ animationDelay: "40ms" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t.operations}</p>
          <p className="mt-1.5 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Users size={18} className="text-cyan-600" />
            {totalOperations}
          </p>
        </article>
        <article className="bank-card hover-lift reveal p-4" style={{ animationDelay: "110ms" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t.documents}</p>
          <p className="mt-1.5 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <FileText size={18} className="text-cyan-600" />
            {totalDocs}
          </p>
        </article>
        <article className="bank-card hover-lift reveal p-4" style={{ animationDelay: "180ms" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t.uniqueClients}</p>
          <p className="mt-1.5 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <FolderSearch size={18} className="text-cyan-600" />
            {uniqueClients}
          </p>
        </article>
      </div>

      <article className="bank-card overflow-hidden p-6 reveal" style={{ animationDelay: "220ms" }}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-navy">{t.opsRegistered}</h2>
            <p className="text-sm text-slate-500">{t.opsSubtitle}</p>
            <p className="mt-1 text-xs text-slate-500">
              {t.showing} {startRow}-{endRow} {t.of} {totalOperations} {t.operations.toLowerCase()}.
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
                  placeholder={t.searchPlaceholder}
                  defaultValue={query}
                />
              </div>
              <button className="bank-btn-secondary text-sm" type="submit">
                {t.filter}
              </button>
              {query && (
                <Link className="bank-btn-secondary text-sm" href={`/operaciones?period=${period}&page=1`}>
                  {t.clear}
                </Link>
              )}
            </form>
            <Link href="/operaciones/nueva" className="bank-btn text-sm">
              {t.newOperation}
            </Link>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t.company}</span>
          <button type="button" className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {t.all}
          </button>
          {COMPANIES.map((company) => (
            <button
              key={company}
              type="button"
              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"
            >
              {company}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-500">{t.visualSeg}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="pb-3">{t.client}</th>
                <th className="pb-3">{t.identification}</th>
                <th className="pb-3">{t.company}</th>
                <th className="pb-3">{t.date}</th>
                <th className="pb-3">{t.docs}</th>
                <th className="pb-3">{t.detail}</th>
                <th className="pb-3">{t.aiSearch}</th>
                <th className="pb-3">{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((operation) => {
                const company = companyForOperation(operation.id);
                return (
                  <tr key={operation.id} className="border-b border-slate-100 align-middle transition hover:bg-slate-50/70">
                    <td className="py-4 font-semibold text-slate-800">{operation.clientName}</td>
                    <td className="py-4 text-slate-700">{operation.clientRut}</td>
                    <td className="py-4">
                      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                        {company}
                      </span>
                    </td>
                    <td className="py-4 text-slate-600">{new Date(operation.createdAt).toLocaleString("es-CL")}</td>
                    <td className="py-4">
                      <span className="inline-flex min-w-10 justify-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {operation._count.documents}
                      </span>
                    </td>
                    <td className="py-4">
                      <Link className="font-semibold text-navy underline" href={`/operaciones/${operation.id}`}>
                        {t.open}
                      </Link>
                    </td>
                    <td className="py-4">
                      {session?.role === "ANALISTA" ? (
                        <Link
                          className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
                          href={`/busqueda?operationId=${operation.id}`}
                        >
                          <FileSearch size={14} />
                          {t.searchWithAi}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">{t.analystOnly}</span>
                      )}
                    </td>
                    <td className="py-4">
                      <DeleteOperationButton operationId={operation.id} iconOnly />
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
              {t.page} {page} {t.of} {totalPages}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link className="bank-btn-secondary text-sm" href={`/operaciones?period=${period}${querySuffix}&page=${page - 1}`}>
                  {t.previous}
                </Link>
              ) : (
                <span className="rounded-xl border border-slate-200 px-4 py-2 text-slate-400">{t.previous}</span>
              )}
              {page < totalPages ? (
                <Link className="bank-btn-secondary text-sm" href={`/operaciones?period=${period}${querySuffix}&page=${page + 1}`}>
                  {t.next}
                </Link>
              ) : (
                <span className="rounded-xl border border-slate-200 px-4 py-2 text-slate-400">{t.next}</span>
              )}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
