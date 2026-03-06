import Link from "next/link";
import { OperationStatus, Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { ReviewQueue } from "@/components/review-queue";
import { getSession } from "@/lib/auth";
import { getRequestLang } from "@/lib/i18n";
import { OPERATION_STATUS_ORDER, operationStatusLabel } from "@/lib/operation-status";
import { prisma } from "@/lib/prisma";

type StatusFilter = OperationStatus | "all";

function parseStatus(input?: string): StatusFilter {
  if (!input) return "all";
  if (input === "all") return "all";
  if (OPERATION_STATUS_ORDER.includes(input as OperationStatus)) return input as OperationStatus;
  return "all";
}

export default async function RevisionPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; company?: string; q?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== Role.ANALISTA) redirect("/operaciones");
  const lang = await getRequestLang();
  const sp = await searchParams;
  const statusFilter = parseStatus(sp.status);
  const companyFilter = (sp.company ?? "all").trim() || "all";
  const query = (sp.q ?? "").trim();
  const take = 20;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const skip = (page - 1) * take;

  const where = {
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(companyFilter !== "all" ? { createdBy: { companyId: companyFilter } } : {}),
    ...(query
      ? {
          OR: [
            { clientName: { contains: query, mode: "insensitive" as const } },
            { clientRut: { contains: query, mode: "insensitive" as const } }
          ]
        }
      : {})
  };

  const [operations, total, companies] = await prisma.$transaction([
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
        status: true,
        _count: { select: { documents: true } },
        createdBy: { select: { company: { select: { name: true } } } }
      }
    }),
    prisma.operation.count({ where }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / take));
  const queryParts = [
    query ? `q=${encodeURIComponent(query)}` : "",
    companyFilter !== "all" ? `company=${encodeURIComponent(companyFilter)}` : "",
    statusFilter !== "all" ? `status=${encodeURIComponent(statusFilter)}` : ""
  ].filter(Boolean);
  const querySuffix = queryParts.join("&");

  const title = lang === "en" ? "Review queue" : "Bandeja de revisión";
  const subtitle =
    lang === "en"
      ? "Manage operational status after capture and AI."
      : "Gestiona el estado operativo luego de captura y AI.";

  return (
    <section className="space-y-5">
      <article className="bank-card p-6">
        <div className="inline-flex items-center gap-2 text-cyan-700">
          <ClipboardCheck size={18} />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Review</p>
        </div>
        <h2 className="mt-2 font-display text-3xl text-navy">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {lang === "en" ? "Status" : "Estado"}
          </span>
          <Link
            href={`/revision?company=${companyFilter}${query ? `&q=${encodeURIComponent(query)}` : ""}&status=all&page=1`}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              statusFilter === "all" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {lang === "en" ? "All" : "Todos"}
          </Link>
          {OPERATION_STATUS_ORDER.map((status) => (
            <Link
              key={status}
              href={`/revision?company=${companyFilter}${query ? `&q=${encodeURIComponent(query)}` : ""}&status=${status}&page=1`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                statusFilter === status ? "border-cyan-300 bg-cyan-100 text-cyan-900" : "border-cyan-200 bg-cyan-50 text-cyan-800"
              }`}
            >
              {operationStatusLabel(status, lang)}
            </Link>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {lang === "en" ? "Company" : "Empresa"}
          </span>
          <Link
            href={`/revision?status=${statusFilter}${query ? `&q=${encodeURIComponent(query)}` : ""}&company=all&page=1`}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              companyFilter === "all" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {lang === "en" ? "All" : "Todas"}
          </Link>
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/revision?status=${statusFilter}${query ? `&q=${encodeURIComponent(query)}` : ""}&company=${encodeURIComponent(company.id)}&page=1`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                companyFilter === company.id ? "border-blue-300 bg-blue-100 text-blue-900" : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              {company.name}
            </Link>
          ))}
        </div>
      </article>

      <ReviewQueue
        lang={lang}
        items={operations.map((operation) => ({
          id: operation.id,
          clientName: operation.clientName,
          clientRut: operation.clientRut,
          createdAt: operation.createdAt.toISOString(),
          status: operation.status,
          documentsCount: operation._count.documents,
          companyName: operation.createdBy.company?.name ?? null
        }))}
      />

      {total > 0 && (
        <article className="bank-card flex items-center justify-between p-4 text-sm">
          <p className="text-slate-500">
            {lang === "en" ? "Page" : "Página"} {page} {lang === "en" ? "of" : "de"} {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link className="bank-btn-secondary text-sm" href={`/revision?${querySuffix ? `${querySuffix}&` : ""}page=${page - 1}`}>
                {lang === "en" ? "Previous" : "Anterior"}
              </Link>
            ) : (
              <span className="rounded-xl border border-slate-200 px-4 py-2 text-slate-400">{lang === "en" ? "Previous" : "Anterior"}</span>
            )}
            {page < totalPages ? (
              <Link className="bank-btn-secondary text-sm" href={`/revision?${querySuffix ? `${querySuffix}&` : ""}page=${page + 1}`}>
                {lang === "en" ? "Next" : "Siguiente"}
              </Link>
            ) : (
              <span className="rounded-xl border border-slate-200 px-4 py-2 text-slate-400">{lang === "en" ? "Next" : "Siguiente"}</span>
            )}
          </div>
        </article>
      )}
    </section>
  );
}
