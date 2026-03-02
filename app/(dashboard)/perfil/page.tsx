import { ProfileAdmin } from "@/components/profile-admin";
import { getRequestLang } from "@/lib/i18n";

export default async function ProfilePage() {
  const lang = await getRequestLang();
  return <ProfileAdmin lang={lang} />;
}
