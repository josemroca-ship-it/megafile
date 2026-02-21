"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "No fue posible iniciar sesión.");
      setLoading(false);
      return;
    }

    router.push("/operaciones");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center p-4 md:p-8">
      <section className="grid w-full gap-5 md:grid-cols-[1.1fr_0.9fr]">
        <article className="bank-card-dark p-7 md:p-10">
          <img src="/megafy-logo.png" alt="Megafy" className="h-12 w-auto" />
          <h1 className="mt-4 font-display text-4xl leading-tight text-white">Megafile: conocimiento documental a un prompt</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Plataforma interna para registro, consulta y análisis inteligente de documentación bancaria en flujos operativos.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-xs text-slate-200">
            <div className="rounded-xl border border-white/20 bg-white/5 p-3">Extracción IA sobre facturas y identidad</div>
            <div className="rounded-xl border border-white/20 bg-white/5 p-3">Búsqueda experta sobre operaciones</div>
          </div>
        </article>

        <article className="bank-card p-7 md:p-8">
          <div className="flex items-center gap-2 text-navy">
            <LockKeyhole size={18} />
            <p className="text-sm font-semibold uppercase tracking-[0.16em]">Acceso seguro</p>
          </div>
          <h2 className="mt-3 font-display text-3xl text-navy">Iniciar sesión</h2>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="bank-label">Usuario</label>
              <input className="bank-input" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <label className="bank-label">Contraseña</label>
              <input
                className="bank-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
            <button className="bank-btn w-full" type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Entrar al portal"}
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
