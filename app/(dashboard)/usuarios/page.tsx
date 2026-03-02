import { UsersAdmin } from "@/components/users-admin";
import { getRequestLang } from "@/lib/i18n";

export default async function UsersPage() {
  const lang = await getRequestLang();
  return <UsersAdmin lang={lang} />;
}
