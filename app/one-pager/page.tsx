import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, ChartColumnBig, FileSearch, FolderUp, ShieldCheck, Sparkles, Users } from "lucide-react";

const benefits = [
  "Cuts manual document handling and search time across operations.",
  "Turns unstructured files into searchable, AI-assisted knowledge.",
  "Improves traceability for clients, operations, and supporting evidence.",
  "Strengthens governance with role-based access and document security controls.",
  "Accelerates analyst response for audits, compliance, and internal requests."
];

const features = [
  {
    icon: FolderUp,
    title: "Smart Capture",
    description: "Capture PDFs and images from desktop or mobile camera in a structured operation flow."
  },
  {
    icon: Bot,
    title: "AI Extraction",
    description: "Extracts key fields and summaries from documents for downstream validation and retrieval."
  },
  {
    icon: FileSearch,
    title: "Conversational AI Search",
    description: "Ask natural-language questions and get grounded answers with evidence snippets and source files."
  },
  {
    icon: ChartColumnBig,
    title: "AI Reports & Insights",
    description: "Generate charts and export reports in CSV/PDF for operational tracking and management."
  },
  {
    icon: ShieldCheck,
    title: "Document Security",
    description: "Apply role-based permissions and governance controls by document type and company context."
  },
  {
    icon: Users,
    title: "Role-Based Operations",
    description: "Built for operators and analysts with separated capture, review, and intelligence workflows."
  }
];

export default function OnePagerPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 md:px-8">
      <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-slate-900 via-[#0d1d3d] to-slate-900 p-6 shadow-[0_24px_80px_rgba(8,145,178,0.18)] md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Image src="/sonda_megafy.jpg" alt="Sonda powered by Megafy" width={160} height={56} className="h-12 w-auto rounded-sm bg-white p-1.5" />
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-200/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">
            <Sparkles size={14} />
            Product One-Pager
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Megafyle by Megafy</p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-white md:text-5xl">
              Megafyle: AI-powered document intelligence for operational teams
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200">
              Megafyle orchestrates capture, extraction, search, and reporting over enterprise documents. Teams move from scattered files to trusted, searchable knowledge with AI-grounded answers and evidence.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Access Platform <ArrowRight size={16} />
              </Link>
              <a
                href="https://www.megafy.net"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Developed by Megafy
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/70">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/alt-hero-dashboard.svg"
                alt="Megafyle dashboard mockup"
                className="h-auto min-h-44 w-full object-contain"
                loading="eager"
              />
            </div>
            <p className="mt-2 text-xs text-slate-300">Mockup: AI search + reporting workspace</p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-slate-200/10 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-white">Business Benefits</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-200">
            {benefits.map((item) => (
              <li key={item} className="rounded-lg border border-cyan-200/20 bg-cyan-200/5 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200/10 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-white">Core Capabilities</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-slate-200/10 bg-white/5 p-3">
                <div className="mb-2 inline-flex rounded-lg bg-cyan-300/20 p-2 text-cyan-100">
                  <feature.icon size={16} />
                </div>
                <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
