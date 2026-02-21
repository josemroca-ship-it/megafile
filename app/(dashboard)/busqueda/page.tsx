import { redirect } from "next/navigation";
import { SearchAgent } from "@/components/search-agent";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SearchPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const operations = await prisma.operation.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      clientName: true,
      clientRut: true,
      createdAt: true
    }
  });

  return (
    <SearchAgent
      username={session.username}
      operations={operations.map((op) => ({
        id: op.id,
        label: `${op.clientName} · ID ${op.clientRut} · ${new Date(op.createdAt).toLocaleDateString("es-CL")}`
      }))}
    />
  );
}
