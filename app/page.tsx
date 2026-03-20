import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ChartColumnBig,
  CheckCircle2,
  FileSearch,
  FileText,
  FolderUp,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getSession } from "@/lib/auth";
import { getRequestLang, type Lang } from "@/lib/i18n";

type Feature = { icon: any; title: string; description: string };
type PortalEntry = { title: string; description: string; href: string; accent: string; icon: any; cta: string };

type HomeCopy = {
  badge: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryDashboard: string;
  primaryLogin: string;
  seeFeatures: string;
  capture: string;
  query: string;
  control: string;
  captureValue: string;
  queryValue: string;
  controlValue: string;
  valueView: string;
  valueTag: string;
  commonProblem: string;
  commonProblemDesc: string;
  whatBrings: string;
  whatBringsDesc: string;
  searchCard: string;
  reportsCard: string;
  featuresChip: string;
  featuresTitle: string;
  featuresDesc: string;
  benefitsChip: string;
  benefitsTitle: string;
  useCasesChip: string;
  useCasesTitle: string;
  flowTitle: string;
  flowDesc: string;
  executive: string;
  executiveTitle: string;
  executiveDesc: string;
  backFeatures: string;
  portalsChip: string;
  portalsTitle: string;
  portalsDesc: string;
  portals: PortalEntry[];
  features: Feature[];
  benefits: string[];
  useCases: string[];
};

function copyByLang(lang: Lang): HomeCopy {
  if (lang === "en") {
    return {
      badge: "Product one-pager",
      eyebrow: "Megafyle / AI-assisted document portal",
      title: "Usable, searchable, and governed document content",
      description:
        "Megafyle centralizes operations and documents, extracts data with AI, and enables conversational search with evidence. Built for content teams that need speed, control, and traceability.",
      primaryDashboard: "Open dashboard",
      primaryLogin: "Sign in",
      seeFeatures: "See features",
      capture: "Capture",
      query: "Query",
      control: "Control",
      captureValue: "PDF + images + camera",
      queryValue: "Natural language with evidence",
      controlValue: "Permissions by document type",
      valueView: "Value view for Content Management",
      valueTag: "AI + Governance",
      commonProblem: "Common problem",
      commonProblemDesc: "Scattered files, inconsistent metadata, and slow search across multiple documents per operation.",
      whatBrings: "What Megafyle brings",
      whatBringsDesc: "Ingestion, extraction, search, and reporting in one flow for operators and analysts.",
      searchCard: "Chat + snippets + thumbnails",
      reportsCard: "KPIs, charts, CSV/PDF",
      featuresChip: "Features",
      featuresTitle: "What the application can do today",
      featuresDesc: "Capabilities focused on capture, retrieval, and analysis of operational document content.",
      benefitsChip: "Benefits",
      benefitsTitle: "Value for Content Management teams",
      useCasesChip: "Use cases",
      useCasesTitle: "Where it fits best",
      flowTitle: "Summary flow",
      flowDesc: "Capture documents → AI extracts fields → analyst queries by prompt → reports and exports for follow-up.",
      executive: "Executive summary",
      executiveTitle: "An intelligence layer over your operational document management",
      executiveDesc:
        "Megafyle combines document capture, AI extraction, assisted search, and reporting to transform operational content into accessible, actionable information.",
      backFeatures: "Back to features",
      portalsChip: "Portals",
      portalsTitle: "Choose the experience you want to open",
      portalsDesc: "Use the animated entry page as a switchboard for the active demos.",
      portals: [
        {
          title: "COMEX Portal",
          description: "Foreign trade portal with smart assistant for operational documents, international workflows, and contract signature.",
          href: "/portalcliente",
          accent: "from-cyan-500 to-blue-500",
          icon: FolderUp,
          cta: "Open COMEX portal"
        },
        {
          title: "Health Preadmission Portal",
          description: "Patient portal for digital preadmission, document validation, signature flow, and QR-based arrival confirmation.",
          href: "/portalclinica",
          accent: "from-emerald-500 to-teal-500",
          icon: ShieldCheck,
          cta: "Open health portal"
        }
      ],
      features: [
        {
          icon: FolderUp,
          title: "Multi-format document ingestion",
          description: "Upload PDFs and images with drag & drop or mobile camera to register operations and documents in minutes."
        },
        {
          icon: Bot,
          title: "AI data extraction",
          description: "The system processes documents in the background and extracts relevant fields for search and tracking."
        },
        {
          icon: ScanSearch,
          title: "Conversational search with evidence",
          description: "Ask in natural language and review thumbnails, snippets, and source documents for each answer."
        },
        {
          icon: ChartColumnBig,
          title: "AI reports + export",
          description: "Generate operational reports with visualizations and export results to CSV or PDF."
        },
        {
          icon: ShieldCheck,
          title: "Document governance and security",
          description: "Permission matrix by document type to reinforce controlled access and information policies."
        },
        {
          icon: Users,
          title: "Role-based operation",
          description: "Separate flows for capture and analysis, ideal for content ops, backoffice, and compliance teams."
        }
      ],
      benefits: [
        "Reduce time spent classifying and manually searching documents.",
        "Turn scattered files into AI-searchable content.",
        "Improve traceability for clients, operations, and related evidence.",
        "Speed up responses to audits, reviews, and internal requests.",
        "Scale document operations without relying on tribal knowledge."
      ],
      useCases: [
        "Manage client files and supporting documentation.",
        "Quickly find invoices, IDs, and attachments across teams.",
        "Curate and retrieve content in multi-entity operations.",
        "Analyze document volume and activity by period."
      ]
    };
  }

  return {
    badge: "One-page de producto",
    eyebrow: "Megafyle / Portal documental asistido por IA",
    title: "Contenido documental utilizable, buscable y gobernado",
    description:
      "Megafyle centraliza operaciones y documentos, extrae datos con IA y permite búsqueda conversacional con evidencias. Diseñado para equipos de content management que necesitan velocidad, control y trazabilidad.",
    primaryDashboard: "Entrar al dashboard",
    primaryLogin: "Iniciar sesión",
    seeFeatures: "Ver características",
    capture: "Captura",
    query: "Consulta",
    control: "Control",
    captureValue: "PDF + imágenes + cámara",
    queryValue: "Lenguaje natural con evidencia",
    controlValue: "Permisos por tipo documental",
    valueView: "Vista de valor para Content Management",
    valueTag: "IA + Gobierno",
    commonProblem: "Problema habitual",
    commonProblemDesc: "Archivos dispersos, metadatos inconsistentes y búsqueda lenta entre múltiples documentos por operación.",
    whatBrings: "Qué aporta Megafyle",
    whatBringsDesc: "Ingesta, extracción, consulta y reporting en un flujo único para capturadores y analistas.",
    searchCard: "Chat + snippets + miniaturas",
    reportsCard: "KPIs, gráficos, CSV/PDF",
    featuresChip: "Características",
    featuresTitle: "Qué puede hacer la aplicación hoy",
    featuresDesc: "Funcionalidades enfocadas en captura, recuperación y análisis de contenido documental para operaciones y expedientes.",
    benefitsChip: "Beneficios",
    benefitsTitle: "Valor para equipos de Content Management",
    useCasesChip: "Casos de uso",
    useCasesTitle: "Dónde encaja mejor",
    flowTitle: "Flujo resumido",
    flowDesc: "Captura documentos → IA extrae campos → analista consulta por prompt → reportes y exportables para seguimiento.",
    executive: "Resumen ejecutivo",
    executiveTitle: "Una capa de inteligencia sobre tu gestión documental operativa",
    executiveDesc:
      "Megafyle combina captura documental, extracción IA, búsqueda asistida y reporting para transformar contenido operativo en información accesible y accionable.",
    backFeatures: "Volver a características",
    portalsChip: "Portales",
    portalsTitle: "Elige el portal que quieres abrir",
    portalsDesc: "Usa esta portada animada como punto de acceso a los demos activos.",
    portals: [
      {
        title: "Portal COMEX",
        description: "Portal de comercio exterior con asistente inteligente para documentos operacionales, flujos internacionales y firma de contratos.",
        href: "/portalcliente",
        accent: "from-cyan-500 to-blue-500",
        icon: FolderUp,
        cta: "Entrar al Portal COMEX"
      },
      {
        title: "Portal Preadmisión Salud",
        description: "Portal de pacientes para preadmisión digital, validación documental, firma y código QR de ingreso.",
        href: "/portalclinica",
        accent: "from-emerald-500 to-teal-500",
        icon: ShieldCheck,
        cta: "Entrar al Portal Salud"
      }
    ],
    features: [
      {
        icon: FolderUp,
        title: "Ingesta documental multiformato",
        description: "Carga PDFs e imágenes con drag & drop o cámara móvil para registrar operaciones y documentos en minutos."
      },
      {
        icon: Bot,
        title: "Extracción de datos con IA",
        description: "El sistema procesa documentos en segundo plano y extrae campos relevantes para consultas y seguimiento."
      },
      {
        icon: ScanSearch,
        title: "Búsqueda conversacional con evidencias",
        description: "Haz preguntas en lenguaje natural y revisa miniaturas, snippets y el documento fuente de cada respuesta."
      },
      {
        icon: ChartColumnBig,
        title: "Reportes IA + exportación",
        description: "Genera reportes operacionales con visualizaciones y exporta resultados a CSV o PDF."
      },
      {
        icon: ShieldCheck,
        title: "Gobierno y seguridad documental",
        description: "Matriz de permisos por tipo de documento para reforzar acceso controlado y políticas de información."
      },
      {
        icon: Users,
        title: "Operación por roles",
        description: "Flujo separado para captura y análisis, ideal para equipos de content ops, backoffice y compliance."
      }
    ],
    benefits: [
      "Reduce tiempo de clasificación y búsqueda manual de documentos.",
      "Convierte archivos dispersos en contenido consultable por IA.",
      "Mejora trazabilidad de clientes, operaciones y respaldos asociados.",
      "Acelera respuesta a auditorías, revisiones y requerimientos internos.",
      "Escala la gestión documental sin depender de conocimiento tribal."
    ],
    useCases: [
      "Gestión de expedientes de clientes y respaldos documentales.",
      "Consulta rápida de facturas, identificaciones y anexos por equipo.",
      "Curación y recuperación de contenido en operaciones multientidad.",
      "Analítica de volumen documental y actividad por período."
    ]
  };
}

export default async function HomePage() {
  const session = await getSession();
  const lang = await getRequestLang();
  const copy = copyByLang(lang);
  const primaryHref = session ? "/operaciones" : "/login";
  const primaryLabel = session ? copy.primaryDashboard : copy.primaryLogin;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <section className="bank-shell relative overflow-hidden p-6 md:p-10">
        <div className="absolute right-6 top-6 z-20">
          <LanguageSwitcher lang={lang} />
        </div>
        <div className="pointer-events-none absolute -right-16 top-8 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-8 h-44 w-44 rounded-full bg-blue-300/20 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/70 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
              <Sparkles size={14} />
              {copy.badge}
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.eyebrow}</p>
              <h1 className="mt-2 font-display text-4xl leading-tight text-slate-900 md:text-5xl">{copy.title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">{copy.description}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={copy.portals[0]?.href ?? "/portalcliente"} className="bank-btn inline-flex items-center gap-2">
                {copy.portals[0]?.cta ?? "Abrir portal"}
                <ArrowRight size={16} />
              </Link>
              <Link href={copy.portals[1]?.href ?? "/portalclinica"} className="bank-btn-secondary inline-flex items-center gap-2">
                {copy.portals[1]?.cta ?? "Abrir portal"}
                <ArrowRight size={16} />
              </Link>
              <Link href={primaryHref} className="bank-btn-ghost inline-flex items-center gap-2">
                {primaryLabel}
                <ArrowRight size={16} />
              </Link>
              <a href="#portales" className="bank-btn-secondary inline-flex items-center gap-2">
                {copy.seeFeatures}
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{copy.capture}</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FolderUp size={16} className="text-cyan-600" />
                  {copy.captureValue}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{copy.query}</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileSearch size={16} className="text-cyan-600" />
                  {copy.queryValue}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{copy.control}</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <LockKeyhole size={16} className="text-cyan-600" />
                  {copy.controlValue}
                </p>
              </article>
            </div>
          </div>

          <div className="bank-card-dark relative overflow-hidden p-6 md:p-7">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{copy.valueView}</p>
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                {copy.valueTag}
              </span>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-300">{copy.commonProblem}</p>
                <p className="mt-2 text-sm text-slate-100">{copy.commonProblemDesc}</p>
              </div>
              <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">{copy.whatBrings}</p>
                <p className="mt-2 text-sm text-slate-100">{copy.whatBringsDesc}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-300">Search</p>
                  <p className="mt-1 text-sm font-semibold text-white">{copy.searchCard}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-300">Reports</p>
                  <p className="mt-1 text-sm font-semibold text-white">{copy.reportsCard}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="portales" className="mt-8">
        <div className="bank-card p-6 md:p-8">
          <div className="mb-6">
            <div className="bank-chip">{copy.portalsChip}</div>
            <h2 className="mt-3 font-display text-3xl text-slate-900">{copy.portalsTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{copy.portalsDesc}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {copy.portals.map((portal, index) => {
              const Icon = portal.icon;
              return (
                <article
                  key={portal.title}
                  className="hover-lift reveal relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${portal.accent}`} />
                  <div className="flex items-start justify-between gap-4">
                    <div className={`inline-flex rounded-2xl bg-gradient-to-br ${portal.accent} p-3 text-white shadow-lg`}>
                      <Icon size={22} />
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Megafyle Demo
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-2xl text-slate-900">{portal.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{portal.description}</p>
                  <Link href={portal.href} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-white">
                    {portal.cta}
                    <ArrowRight size={15} />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="caracteristicas" className="mt-8">
        <div className="bank-card p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="bank-chip">{copy.featuresChip}</div>
              <h2 className="mt-3 font-display text-3xl text-slate-900">{copy.featuresTitle}</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">{copy.featuresDesc}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {copy.features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="hover-lift rounded-2xl border border-slate-200 bg-white p-5 reveal"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="inline-flex rounded-xl border border-cyan-200 bg-cyan-50 p-2.5 text-cyan-700">
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="bank-card p-6 md:p-7">
          <div className="bank-chip">{copy.benefitsChip}</div>
          <h2 className="mt-3 font-display text-2xl text-slate-900">{copy.benefitsTitle}</h2>
          <ul className="mt-5 space-y-3">
            {copy.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="bank-card p-6 md:p-7">
          <div className="bank-chip">{copy.useCasesChip}</div>
          <h2 className="mt-3 font-display text-2xl text-slate-900">{copy.useCasesTitle}</h2>
          <div className="mt-5 grid gap-3">
            {copy.useCases.map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-800">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">{copy.flowTitle}</p>
            <p className="mt-2 text-sm text-blue-900">{copy.flowDesc}</p>
          </div>
        </article>
      </section>

      <section className="mt-8">
        <article className="bank-shell p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
                <FileText size={14} />
                {copy.executive}
              </div>
              <h2 className="mt-3 font-display text-2xl text-slate-900 md:text-3xl">{copy.executiveTitle}</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">{copy.executiveDesc}</p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href={primaryHref} className="bank-btn inline-flex items-center gap-2">
                {primaryLabel}
                <ArrowRight size={16} />
              </Link>
              <a href="#caracteristicas" className="bank-btn-secondary">
                {copy.backFeatures}
              </a>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
