import { cookies } from "next/headers";

export type Lang = "es" | "en";

export const LANG_COOKIE = "megafyle_lang";

export function normalizeLang(value?: string | null): Lang {
  return value === "en" ? "en" : "es";
}

export async function getRequestLang(): Promise<Lang> {
  const store = await cookies();
  return normalizeLang(store.get(LANG_COOKIE)?.value);
}
