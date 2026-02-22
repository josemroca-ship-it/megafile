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
            <div className="inline-flex rounded-xl border border-white/20 bg-white/10 p-1.5 shadow-lg shadow-black/20 backdrop-blur-sm">
              <img src="/megafy-logo.png" alt="Megafy" className="h-12 w-auto rounded-md" />
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
              <Sparkles size={13} />
              Agentes IA documentales
            </div>

            <h1 className="mt-4 font-display text-4xl leading-tight text-white md:text-5xl">
              Encuentra información de manera inteligente
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
              Orquesta, captura, extrae y busca con agentes de IA sobre tus datos.
            </p>

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-4">
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
                  <rect x="42" y="92" width="144" height="24" rx="8" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.08)" />
                  <rect x="42" y="124" width="132" height="24" rx="8" fill="rgba(45,212,191,0.10)" stroke="rgba(45,212,191,0.25)" />
                  <rect x="42" y="156" width="120" height="24" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" />
                  <rect x="52" y="98" width="14" height="12" rx="2" fill="rgba(148,163,184,0.65)" />
                  <rect x="72" y="98" width="62" height="4" rx="2" fill="rgba(226,232,240,0.8)" />
                  <rect x="72" y="106" width="48" height="3" rx="1.5" fill="rgba(148,163,184,0.65)" />
                  <rect x="52" y="130" width="14" height="12" rx="2" fill="rgba(45,212,191,0.7)" />
                  <rect x="72" y="130" width="56" height="4" rx="2" fill="rgba(153,246,228,0.9)" />
                  <rect x="72" y="138" width="38" height="3" rx="1.5" fill="rgba(94,234,212,0.7)" />
                  <rect x="52" y="162" width="14" height="12" rx="2" fill="rgba(148,163,184,0.55)" />
                  <rect x="72" y="162" width="52" height="4" rx="2" fill="rgba(226,232,240,0.72)" />
                  <rect x="72" y="170" width="44" height="3" rx="1.5" fill="rgba(148,163,184,0.55)" />

                  <rect x="282" y="34" width="196" height="188" rx="18" fill="rgba(10,20,40,0.45)" stroke="rgba(96,165,250,0.35)" />
                  <g>
                    <circle cx="380" cy="88" r="34" fill="rgba(96,165,250,0.10)" stroke="rgba(96,165,250,0.35)" />
                    <circle cx="380" cy="88" r="18" fill="rgba(15,23,42,0.55)" stroke="rgba(45,212,191,0.35)" />
                    <circle cx="380" cy="88" r="6.5" fill="rgba(45,212,191,0.22)" stroke="rgba(45,212,191,0.7)" />
                    <circle cx="380" cy="88" r="2.4" fill="rgba(191,219,254,0.95)" />
                    <circle cx="362" cy="88" r="4" fill="rgba(96,165,250,0.14)" stroke="rgba(96,165,250,0.4)" />
                    <circle cx="398" cy="88" r="4" fill="rgba(96,165,250,0.14)" stroke="rgba(96,165,250,0.4)" />
                    <circle cx="380" cy="70" r="4" fill="rgba(45,212,191,0.14)" stroke="rgba(45,212,191,0.4)" />
                    <circle cx="380" cy="106" r="4" fill="rgba(45,212,191,0.14)" stroke="rgba(45,212,191,0.4)" />
                    <path d="M366 88 H374" stroke="rgba(148,163,184,0.65)" strokeWidth="1.8" />
                    <path d="M386 88 H394" stroke="rgba(148,163,184,0.65)" strokeWidth="1.8" />
                    <path d="M380 74 V82" stroke="rgba(148,163,184,0.65)" strokeWidth="1.8" />
                    <path d="M380 94 V102" stroke="rgba(148,163,184,0.65)" strokeWidth="1.8" />
                  </g>
                  <circle cx="344" cy="144" r="8" fill="rgba(45,212,191,0.14)" stroke="rgba(45,212,191,0.45)" />
                  <circle cx="380" cy="144" r="8" fill="rgba(96,165,250,0.14)" stroke="rgba(96,165,250,0.45)" />
                  <circle cx="416" cy="144" r="8" fill="rgba(45,212,191,0.14)" stroke="rgba(45,212,191,0.45)" />
                  <path d="M352 144 H372" stroke="rgba(148,163,184,0.65)" strokeWidth="2" />
                  <path d="M388 144 H408" stroke="rgba(148,163,184,0.65)" strokeWidth="2" />
                  <rect x="310" y="162" width="140" height="10" rx="5" fill="rgba(45,212,191,0.08)" stroke="rgba(45,212,191,0.2)" />
                  <rect x="310" y="178" width="126" height="10" rx="5" fill="rgba(96,165,250,0.08)" stroke="rgba(96,165,250,0.22)" />

                  <rect x="556" y="50" width="180" height="156" rx="16" fill="url(#cardGlow)" stroke="rgba(255,255,255,0.14)" />
                  <rect x="574" y="96" width="144" height="18" rx="8" fill="rgba(255,255,255,0.06)" />
                  <rect x="574" y="122" width="130" height="18" rx="8" fill="rgba(255,255,255,0.06)" />
                  <rect x="574" y="148" width="152" height="26" rx="8" fill="rgba(96,165,250,0.12)" stroke="rgba(96,165,250,0.24)" />
                  <circle cx="588" cy="105" r="4" fill="rgba(96,165,250,0.8)" />
                  <circle cx="606" cy="105" r="4" fill="rgba(45,212,191,0.75)" />
                  <circle cx="624" cy="105" r="4" fill="rgba(96,165,250,0.8)" />
                  <rect x="584" y="127" width="54" height="3" rx="1.5" fill="rgba(226,232,240,0.82)" />
                  <rect x="584" y="133" width="72" height="3" rx="1.5" fill="rgba(148,163,184,0.75)" />
                  <rect x="584" y="156" width="94" height="4" rx="2" fill="rgba(191,219,254,0.95)" />
                  <rect x="584" y="163" width="118" height="4" rx="2" fill="rgba(148,163,184,0.8)" />

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
          <p className="mt-2 text-sm text-slate-600">Encuentra información de manera inteligente.</p>

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
          </div>
        </article>
      </section>
    </main>
  );
}
