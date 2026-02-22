"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Sparkles } from "lucide-react";

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

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-4">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                Flujo IA documental en tiempo real
              </div>

              <div className="relative rounded-xl border border-white/10 bg-slate-950/20 p-2">
                <svg viewBox="0 0 760 260" className="h-[220px] w-full">
                  <defs>
                    <linearGradient id="flowLine" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="rgba(45,212,191,0.2)" />
                      <stop offset="50%" stopColor="rgba(96,165,250,0.9)" />
                      <stop offset="100%" stopColor="rgba(45,212,191,0.2)" />
                    </linearGradient>
                    <linearGradient id="cardGlow" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                    </linearGradient>
                  </defs>

                  <g opacity="0.22">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <line key={`v-${i}`} x1={20 + i * 45} y1="12" x2={20 + i * 45} y2="248" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                    ))}
                    {Array.from({ length: 6 }).map((_, i) => (
                      <line key={`h-${i}`} x1="12" y1={20 + i * 40} x2="748" y2={20 + i * 40} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                    ))}
                  </g>

                  <rect x="24" y="50" width="180" height="156" rx="16" fill="url(#cardGlow)" stroke="rgba(255,255,255,0.14)" />
                  <text x="42" y="78" fill="rgba(191,219,254,0.95)" fontSize="12" fontWeight="700">DOCUMENTOS</text>
                  <rect x="42" y="92" width="144" height="24" rx="8" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.08)" />
                  <rect x="42" y="124" width="132" height="24" rx="8" fill="rgba(45,212,191,0.10)" stroke="rgba(45,212,191,0.25)" />
                  <rect x="42" y="156" width="120" height="24" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" />
                  <text x="54" y="109" fill="rgba(255,255,255,0.9)" fontSize="10">Factura_018.pdf</text>
                  <text x="54" y="141" fill="rgba(153,246,228,0.95)" fontSize="10">Cedula_cliente.jpg</text>
                  <text x="54" y="173" fill="rgba(226,232,240,0.9)" fontSize="10">Solicitud_credito.pdf</text>

                  <rect x="282" y="34" width="196" height="188" rx="18" fill="rgba(10,20,40,0.45)" stroke="rgba(96,165,250,0.35)" />
                  <circle cx="380" cy="88" r="30" fill="rgba(96,165,250,0.12)" stroke="rgba(96,165,250,0.4)" />
                  <circle cx="380" cy="88" r="13" fill="rgba(45,212,191,0.20)" stroke="rgba(45,212,191,0.55)" />
                  <text x="336" y="138" fill="rgba(191,219,254,0.98)" fontSize="12" fontWeight="700">AGENTE MEGAFILE IA</text>
                  <rect x="310" y="152" width="140" height="18" rx="9" fill="rgba(45,212,191,0.08)" stroke="rgba(45,212,191,0.2)" />
                  <text x="321" y="164.5" fill="rgba(153,246,228,0.95)" fontSize="9">Extrayendo campos relevantes...</text>
                  <rect x="310" y="176" width="126" height="18" rx="9" fill="rgba(96,165,250,0.08)" stroke="rgba(96,165,250,0.22)" />
                  <text x="321" y="188.5" fill="rgba(191,219,254,0.95)" fontSize="9">Indexando para búsqueda IA...</text>

                  <rect x="556" y="50" width="180" height="156" rx="16" fill="url(#cardGlow)" stroke="rgba(255,255,255,0.14)" />
                  <text x="574" y="78" fill="rgba(191,219,254,0.95)" fontSize="12" fontWeight="700">EVIDENCIAS / RESPUESTA</text>
                  <rect x="574" y="96" width="144" height="18" rx="8" fill="rgba(255,255,255,0.06)" />
                  <rect x="574" y="122" width="130" height="18" rx="8" fill="rgba(255,255,255,0.06)" />
                  <rect x="574" y="148" width="152" height="26" rx="8" fill="rgba(96,165,250,0.12)" stroke="rgba(96,165,250,0.24)" />
                  <text x="585" y="108" fill="rgba(226,232,240,0.9)" fontSize="9">4 documentos coincidentes</text>
                  <text x="585" y="134" fill="rgba(226,232,240,0.9)" fontSize="9">referencias + thumbnail + enlace</text>
                  <text x="585" y="164" fill="rgba(191,219,254,0.98)" fontSize="9">Respuesta en lenguaje natural</text>

                  <path d="M204 128 C235 128, 250 128, 282 128" stroke="url(#flowLine)" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M478 128 C510 128, 524 128, 556 128" stroke="url(#flowLine)" strokeWidth="3" fill="none" strokeLinecap="round" />

                  <circle cx="220" cy="128" r="4" fill="rgba(45,212,191,0.95)">
                    <animate attributeName="cx" values="204;282;204" dur="3.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="3.2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="494" cy="128" r="4" fill="rgba(96,165,250,0.95)">
                    <animate attributeName="cx" values="478;556;478" dur="3.2s" begin="0.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="3.2s" begin="0.6s" repeatCount="indefinite" />
                  </circle>

                  <rect x="334" y="54" width="92" height="14" rx="7" fill="rgba(255,255,255,0.04)">
                    <animate attributeName="opacity" values="0.25;0.9;0.25" dur="1.8s" repeatCount="indefinite" />
                  </rect>
                </svg>
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
