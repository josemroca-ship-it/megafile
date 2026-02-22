"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";

function BlurIn({
  children,
  delay = 0
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div className="alt-blur-in" style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

function SplitText({
  text,
  className,
  baseDelay = 0,
  wordDelay = 0.08
}: {
  text: string;
  className?: string;
  baseDelay?: number;
  wordDelay?: number;
}) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
          <span
            className="alt-split-word inline-block"
            style={{
              animationDelay: `${baseDelay + i * wordDelay}s`
            }}
          >
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </span>
        </span>
      ))}
    </span>
  );
}

function LogoMark() {
  return (
    <svg width="134" height="25" viewBox="0 0 134 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="MEGAFILE">
      <text
        x="0"
        y="18"
        fill="#FFFFFF"
        fontFamily="Manrope, sans-serif"
        fontSize="20"
        fontWeight="700"
        letterSpacing="1.2"
      >
        MEGAFILE
      </text>
    </svg>
  );
}

export default function LoginAltPage() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#070612] text-white">
      <video
        className="pointer-events-none absolute inset-y-0 left-0 z-0 h-full w-full origin-left scale-[1.2] object-cover"
        style={{ marginLeft: 200 }}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="https://stream.mux.com/s8pMcOvMQXc4GD6AX4e1o01xFogFxipmuKltNfSYza0200.m3u8" type="application/x-mpegURL" />
      </video>

      <div className="pointer-events-none absolute inset-0 z-[10] bg-gradient-to-t from-[#070612] via-[#070612]/45 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[10] h-40 bg-gradient-to-t from-[#070612] to-transparent" />

      <div className="relative z-[20] h-full">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-12">
          <div className="flex items-center gap-10 lg:gap-20">
            <LogoMark />

            <nav className="hidden items-center gap-[10px] md:flex">
              <Link className="px-[10px] py-[4px] text-[14px] font-medium leading-[22px] text-white" href="/login-alt">
                Home
              </Link>
              <button type="button" className="inline-flex items-center gap-[3px] px-[10px] py-[4px] text-[14px] font-medium leading-[22px] text-white">
                Servicios
                <ChevronDown className="h-6 w-6 text-white" />
              </button>
              <button type="button" className="px-[10px] py-[4px] text-[14px] font-medium leading-[22px] text-white">
                Clientes
              </button>
              <button type="button" className="px-[10px] py-[4px] text-[14px] font-medium leading-[22px] text-white">
                Contáctanos
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/book-call"
              className="rounded-[8px] bg-[#0B3B6E] px-4 py-2 text-[14px] font-semibold leading-[22px] text-[#fafafa]"
              style={{ boxShadow: "0px 4px 16px rgba(23,23,23,0.04)" }}
            >
              Acceder
            </Link>
          </div>
        </header>

        <div className="mx-auto flex h-[calc(100%-88px)] w-full max-w-7xl items-center px-6 lg:px-12">
          <div className="w-full max-w-[871px]">
            <div className="flex flex-col gap-12">
              <div className="flex flex-col gap-6">
                <BlurIn delay={0}>
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 backdrop-blur-sm">
                    <Sparkles className="h-3 w-3 text-white/80" />
                    <span className="text-sm font-medium text-white/80">Tu aliado IA en automatización</span>
                  </div>
                </BlurIn>

                <div className="flex flex-col gap-6">
                  <div className="text-left">
                    <div className="text-4xl font-medium leading-tight text-white md:text-5xl lg:text-6xl lg:leading-[1.2]">
                      <SplitText text="Desbloquea el poder de la IA" baseDelay={0.05} />
                    </div>
                    <div className="text-4xl font-medium leading-tight text-white md:text-5xl lg:text-6xl lg:leading-[1.2]">
                      <SplitText text="sobre" baseDelay={0.25} />{" "}
                      <span className="font-serif italic">
                        <SplitText text="tus Documentos." baseDelay={0.33} />
                      </span>
                    </div>
                  </div>

                  <BlurIn delay={0.4}>
                    <p className="max-w-xl text-lg font-normal leading-relaxed text-white/80">
                      Orquesta, captura, extrae y busca con agentes de IA sobre tus datos.
                    </p>
                  </BlurIn>
                </div>
              </div>

              <BlurIn delay={0.6}>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/book-call"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[16px] font-medium leading-[1.7] text-[#070612]"
                  >
                    Agenda una demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-full bg-white/20 px-8 py-3 text-[16px] font-medium leading-[1.7] text-white backdrop-blur-sm"
                  >
                    Accede ahora
                  </Link>
                </div>
              </BlurIn>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .alt-blur-in {
          opacity: 0;
          filter: blur(10px);
          transform: translateY(20px);
          animation: altBlurIn 0.6s ease forwards;
        }

        .alt-split-word {
          opacity: 0;
          transform: translateY(40px);
          animation: altSplitIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes altBlurIn {
          to {
            opacity: 1;
            filter: blur(0px);
            transform: translateY(0);
          }
        }

        @keyframes altSplitIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
