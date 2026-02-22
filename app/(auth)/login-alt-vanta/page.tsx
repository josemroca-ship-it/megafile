"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles, Waves, Network } from "lucide-react";

type Mode = "net" | "waves";

declare global {
  interface Window {
    VANTA?: any;
    THREE?: any;
  }
}

function LogoMark() {
  return (
    <svg width="134" height="25" viewBox="0 0 134 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="MEGAFILE">
      <text x="0" y="18" fill="#FFFFFF" fontFamily="Manrope, sans-serif" fontSize="20" fontWeight="700" letterSpacing="1.2">
        MEGAFILE
      </text>
    </svg>
  );
}

export default function LoginAltVantaPage() {
  const bgRef = useRef<HTMLDivElement | null>(null);
  const effectRef = useRef<any>(null);
  const [mode, setMode] = useState<Mode>("net");
  const [libsReady, setLibsReady] = useState(false);

  useEffect(() => {
    if (!libsReady || !bgRef.current || !window.VANTA) return;

    if (effectRef.current) {
      effectRef.current.destroy?.();
      effectRef.current = null;
    }

    const common = {
      el: bgRef.current,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      backgroundColor: 0x070612
    };

    if (mode === "net" && window.VANTA.NET) {
      effectRef.current = window.VANTA.NET({
        ...common,
        color: 0x0b3b6e,
        points: 11,
        maxDistance: 22,
        spacing: 17,
        showDots: false
      });
    } else if (mode === "waves" && window.VANTA.WAVES) {
      effectRef.current = window.VANTA.WAVES({
        ...common,
        color: 0x0b3b6e,
        shininess: 36,
        waveHeight: 14,
        waveSpeed: 0.65,
        zoom: 0.85
      });
    }

    return () => {
      effectRef.current?.destroy?.();
      effectRef.current = null;
    };
  }, [libsReady, mode]);

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-[#070612] text-white">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js" strategy="afterInteractive" />
      <Script
        src="https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.waves.min.js"
        strategy="afterInteractive"
        onLoad={() => setLibsReady(true)}
      />

      <div ref={bgRef} className="absolute inset-0 z-0" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-[#070612] via-[#070612]/75 to-[#070612]/30" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-[#070612] to-transparent" />

      <div className="relative z-20">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-12">
          <div className="flex items-center gap-10">
            <LogoMark />
            <nav className="hidden items-center gap-3 md:flex">
              <Link href="/login-alt-vanta" className="px-3 py-1 text-sm text-white/90">
                Home
              </Link>
              <button type="button" className="px-3 py-1 text-sm text-white/90">
                Servicios
              </button>
              <button type="button" className="px-3 py-1 text-sm text-white/90">
                Clientes
              </button>
              <button type="button" className="px-3 py-1 text-sm text-white/90">
                Contáctanos
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setMode("net")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                mode === "net" ? "bg-white text-[#070612]" : "text-white/85"
              }`}
            >
              <Network size={13} />
              NET
            </button>
            <button
              type="button"
              onClick={() => setMode("waves")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                mode === "waves" ? "bg-white text-[#070612]" : "text-white/85"
              }`}
            >
              <Waves size={13} />
              WAVES
            </button>
          </div>
        </header>

        <div className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-7xl items-center px-6 lg:px-12">
          <div className="w-full max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 backdrop-blur-sm">
              <Sparkles className="h-3 w-3 text-white/80" />
              <span className="text-sm font-medium text-white/80">Prueba de fondo Vanta.js · estilo Megafy</span>
            </div>

            <h1 className="mt-6 text-4xl font-medium leading-tight md:text-6xl">
              Megafile.
              <br />
              <span className="font-serif italic">Automatiza tu gestión documental.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              Orquesta, captura, extrae y busca con agentes de IA sobre tus datos.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/book-call" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#070612]">
                Agenda una demo
                <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="rounded-full bg-white/20 px-8 py-3 text-sm font-semibold text-white backdrop-blur-sm">
                Accede ahora
              </Link>
            </div>

            <p className="mt-8 text-xs text-white/60">
              Ruta de prueba: compara `NET` vs `WAVES` antes de aplicarlo al login alternativo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

