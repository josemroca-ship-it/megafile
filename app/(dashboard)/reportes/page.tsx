import { ProcessAnalyticsStudio } from "@/components/process-analytics-studio";
import { ReportsStudio } from "@/components/reports-studio";
import { getRequestLang } from "@/lib/i18n";

export default async function ReportsPage() {
  const lang = await getRequestLang();
  return (
    <div className="space-y-8">
      <ProcessAnalyticsStudio />
      <ReportsStudio lang={lang} />
    </div>
  );
}
