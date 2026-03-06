import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { CompaniesAdmin } from "@/components/companies-admin";
import { getSession } from "@/lib/auth";
import { getRequestLang } from "@/lib/i18n";

export default async function CompaniesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== Role.ANALISTA) redirect("/operaciones");

  const lang = await getRequestLang();
  return <CompaniesAdmin lang={lang} />;
}
