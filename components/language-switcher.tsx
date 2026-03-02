"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Lang } from "@/lib/i18n";

export function LanguageSwitcher({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function setLang(nextLang: Lang) {
    if (nextLang === lang || pending) return;
    await fetch("/api/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: nextLang })
    });
    startTransition(() => {
      router.refresh();
    });
  }

  function cls(active: boolean) {
    return active
      ? "rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800"
      : "rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50";
  }

  return (
    <div className="inline-flex items-center gap-2" aria-label="Language switcher">
      <button type="button" className={cls(lang === "es")} onClick={() => void setLang("es")} disabled={pending}>
        🇪🇸 ES
      </button>
      <button type="button" className={cls(lang === "en")} onClick={() => void setLang("en")} disabled={pending}>
        🇺🇸 EN
      </button>
    </div>
  );
}
