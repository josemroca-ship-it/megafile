import { Cabin, Instrument_Serif, Inter, Manrope } from "next/font/google";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600"] });
const inter = Inter({ subsets: ["latin"], weight: ["500"] });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["italic"] });
const cabin = Cabin({ subsets: ["latin"], weight: ["500", "600"] });

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
  const megafyBlue = "#0B3B6E";
  const megafyBlueDark = "#11263D";

  return (
    <section className="relative w-full overflow-hidden bg-black text-white">
      <video
        className="pointer-events-none absolute left-1/2 top-0 z-0 h-[120%] w-[120%] -translate-x-1/2 object-cover"
        style={{ objectPosition: "center bottom" }}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260215_121759_424f8e9c-d8bd-4974-9567-52709dfb6842.mp4"
          type="video/mp4"
        />
      </video>

      <div
        className="pointer-events-none absolute left-1/2 z-[1] hidden -translate-x-1/2 rounded-full bg-black md:block"
        style={{ top: 215, width: 801, height: 384, filter: "blur(77.5px)" }}
      />

      <div className="relative z-[2]">
        <header className="mx-auto w-full max-w-[1440px] px-5 py-4 md:h-[102px] md:px-[120px]">
          <div className="flex h-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-20">
              <LogoMark />

              <nav className={`${manrope.className} flex flex-wrap items-center gap-[10px]`}>
                <Link href="/login-alt" className="px-[10px] py-[4px] text-[14px] font-medium leading-[22px] text-white">
                  Home
                </Link>
                <button
                  type="button"
                  className="inline-flex items-center gap-[3px] px-[10px] py-[4px] text-[14px] font-medium leading-[22px] text-white"
                >
                  Servicios
                  <ChevronDown size={24} className="text-white" />
                </button>
                <button type="button" className="px-[10px] py-[4px] text-[14px] font-medium leading-[22px] text-white">
                  Clientes
                </button>
                <button type="button" className="px-[10px] py-[4px] text-[14px] font-medium leading-[22px] text-white">
                  Contact us
                </button>
              </nav>
            </div>

            <div className={`${manrope.className} flex items-center gap-3`}>
              <Link
                href="/login"
                className="relative rounded-[8px] bg-white px-4 py-2 text-[14px] font-semibold leading-[22px] text-[#171717]"
              >
                <span className="absolute inset-0 rounded-[8px] border border-[#d4d4d4]" />
                <span className="relative">Acceso</span>
              </Link>
              <button
                type="button"
                className="rounded-[8px] px-4 py-2 text-[14px] font-semibold leading-[22px] text-[#fafafa]"
                style={{ background: megafyBlue }}
                
              >
                Get Started
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-5 pb-10 md:px-[120px]">
          <div className="mt-16 flex w-full max-w-[871px] flex-col items-center gap-6 text-center md:mt-[162px]">
            <div className="flex flex-col items-center gap-[10px]">
              <h1 className={`${inter.className} text-[40px] font-medium leading-[1.15] tracking-[-2px] text-white md:text-[76px]`}>
                Megafile.
              </h1>
              <h2
                className={`${instrumentSerif.className} text-[40px] italic leading-[1.15] tracking-[-2px] text-white md:text-[76px]`}
              >
                Automatiza tu gestión documental.
              </h2>
              <p
                className={`${manrope.className} mt-1 max-w-[613px] text-[16px] leading-[26px] text-[#f6f7f9] opacity-90 md:text-[18px]`}
              >
                Orquesta, captura, extrae y busca con agentes de IA sobre tus datos.
              </p>
            </div>

            <div className={`${cabin.className} flex flex-col items-center gap-[22px] sm:flex-row`}>
              <button
                type="button"
                className="rounded-[10px] px-6 py-[14px] text-[16px] font-medium leading-[1.7] text-white md:px-[24px]"
                style={{ background: megafyBlue }}
              >
                Acceder a Megafile
              </button>
              <button
                type="button"
                className="rounded-[10px] px-6 py-[14px] text-[16px] font-medium leading-[1.7] text-[#f6f7f9] md:px-[24px]"
                style={{ background: megafyBlueDark }}
              >
                Ver plataforma
              </button>
            </div>
          </div>

          <div className="mt-14 w-full pb-10 md:mt-20">
            <div
              className="mx-auto w-full max-w-[1163px] rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-[10px]"
              style={{ borderWidth: "1.5px" }}
            >
              <div style={{ padding: "22.5px" }}>
                <img
                  src="/alt-hero-dashboard.svg"
                  alt="Dashboard preview"
                  className="h-auto w-full rounded-[8px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
