import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopNav } from "@/components/top-nav";
import { getRequestLang } from "@/lib/i18n";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const lang = await getRequestLang();

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl p-4 md:p-8">
      <TopNav role={session.role} username={session.username} lang={lang} />
      {children}
    </main>
  );
}
