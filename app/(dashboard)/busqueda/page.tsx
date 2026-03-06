import { redirect } from "next/navigation";
import { SearchAgent } from "@/components/search-agent";
import { getSession } from "@/lib/auth";
import { getRequestLang } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ operationId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const lang = await getRequestLang();
  const sp = await searchParams;

  const [operations, companies] = await prisma.$transaction([
    prisma.operation.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        clientName: true,
        clientRut: true,
        createdAt: true
      }
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);

  const initialOperationId =
    sp.operationId && operations.some((op) => op.id === sp.operationId) ? sp.operationId : undefined;

  return (
    <SearchPageContent
      sessionUsername={session.username}
      operations={operations}
      companies={companies}
      initialOperationId={initialOperationId}
      lang={lang}
    />
  );
}

function SearchPageContent({
  sessionUsername,
  operations,
  companies,
  initialOperationId,
  lang
}: {
  sessionUsername: string;
  operations: Array<{ id: string; clientName: string; clientRut: string; createdAt: Date }>;
  companies: Array<{ id: string; name: string }>;
  initialOperationId?: string;
  lang: "es" | "en";
}) {
  const mapped = operations.map((op) => ({
    id: op.id,
    label: `${op.clientName} · ID ${op.clientRut} · ${new Date(op.createdAt).toLocaleDateString("es-CL")}`
  }));

  return <SearchAgent username={sessionUsername} operations={mapped} companies={companies} initialOperationId={initialOperationId} lang={lang} />;
}
