import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });

export const metadata: Metadata = {
  title: "Portal Bancario IA",
  description: "Gestión de operaciones bancarias con agentes IA"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${manrope.variable} ${sora.variable} font-sans`}>
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <footer className="px-6 pb-5 pt-2 text-center text-xs text-slate-600">
            Creado con 🧠 x Megafy
          </footer>
        </div>
      </body>
    </html>
  );
}
