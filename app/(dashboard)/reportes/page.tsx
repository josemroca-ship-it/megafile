import { ReportsStudio } from "@/components/reports-studio";
import { getRequestLang } from "@/lib/i18n";

export default async function ReportsPage() {
  const lang = await getRequestLang();
  return <ReportsStudio lang={lang} />;
}
