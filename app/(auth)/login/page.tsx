"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, FileSearch, LockKeyhole, Network, ScanText, Sparkles } from "lucide-react";

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
    <main className="mx-auto flex min-h-screen max-w-7xl items-center p-4 md:p-8">
      <section className="grid w-full gap-5 md:grid-cols-[1.15fr_0.85fr]">
        <article className="bank-card-dark relative overflow-hidden p-7 md:p-10">
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-cyan-400/20 blur-2xl" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-400/20 blur-2xl" />
            <div className="absolute bottom-8 right-14 h-28 w-28 rounded-full bg-teal-300/15 blur-2xl" />
            <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 animate-pulse bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
          </div>

          <div className="relative z-10">
            <img src="/megafy-logo.png" alt="Megafy" className="h-12 w-auto" />

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
              <Sparkles size={13} />
              Agentes IA documentales
            </div>

            <h1 className="mt-4 font-display text-4xl leading-tight text-white md:text-5xl">
              Megafile: conocimiento documental a un prompt
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
              Orquesta captura, extracción y búsqueda con agentes de IA sobre documentos de clientes y operaciones.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-4">
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(45,212,191,0.12),transparent)]" />
                <div className="relative">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-slate-950/30 px-2 py-1 text-[11px] font-semibold text-cyan-200">
                    <ScanText size={13} />
                    Agente de extracción
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-100">Factura_2026_018.pdf</div>
                    <div className="rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-cyan-100">
                      Detectando campos: monto, fecha, emisor...
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-300">
                      Resultado estructurado listo para búsqueda
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-4">
                <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.4)_1px,transparent_0)] [background-size:14px_14px]" />
                <div className="relative">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-slate-950/30 px-2 py-1 text-[11px] font-semibold text-blue-200">
                    <Bot size={13} />
                    Agente de búsqueda
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-200">
                      “Busca teléfono +569... en documentación”
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-blue-300/30 bg-blue-400/10 px-3 py-2 text-blue-100">
                      <Network size={13} />
                      4 evidencias encontradas
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-300">
                      <FileSearch size={13} />
                      Respuesta con referencias documentales
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-200">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Extracción IA</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">OCR documental</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Búsqueda con evidencias</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Trazabilidad operativa</span>
            </div>
          </div>
        </article>

        <article className="bank-card relative p-7 md:p-8">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.12),transparent_45%)]" />
          <div className="relative">
          <div className="flex items-center gap-2 text-navy">
            <LockKeyhole size={18} />
            <p className="text-sm font-semibold uppercase tracking-[0.16em]">Acceso seguro</p>
          </div>
          <h2 className="mt-3 font-display text-3xl text-navy">Iniciar sesión</h2>
          <p className="mt-2 text-sm text-slate-600">Accede al portal de captura y análisis documental con agentes de IA.</p>

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

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Experiencia optimizada para operador y analista</p>
            <p className="mt-1">Carga documental, búsqueda por lenguaje natural, evidencias y reportes desde una misma plataforma.</p>
          </div>
          </div>
        </article>
      </section>
    </main>
  );
}
