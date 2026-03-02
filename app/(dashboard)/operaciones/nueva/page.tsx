import { NewOperationForm } from "@/components/new-operation-form";
import { getRequestLang } from "@/lib/i18n";

export default async function NewOperationPage() {
  const lang = await getRequestLang();
  return <NewOperationForm lang={lang} />;
}
