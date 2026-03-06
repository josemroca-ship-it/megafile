import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { ValidationRulesAdmin } from "@/components/validation-rules-admin";
import { getSession } from "@/lib/auth";
import { getRequestLang } from "@/lib/i18n";

export default async function ValidationRulesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== Role.ANALISTA) redirect("/operaciones");

  const lang = await getRequestLang();
  return <ValidationRulesAdmin lang={lang} />;
}
