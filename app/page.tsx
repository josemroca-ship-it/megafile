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
import { getSession } from "@/lib/auth";

const features = [
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
];

const benefits = [
  "Reduce tiempo de clasificación y búsqueda manual de documentos.",
  "Convierte archivos dispersos en contenido consultable por IA.",
  "Mejora trazabilidad de clientes, operaciones y respaldos asociados.",
  "Acelera respuesta a auditorías, revisiones y requerimientos internos.",
  "Escala la gestión documental sin depender de conocimiento tribal."
];

const contentUseCases = [
  "Gestión de expedientes de clientes y respaldos documentales.",
  "Consulta rápida de facturas, identificaciones y anexos por equipo.",
  "Curación y recuperación de contenido en operaciones multientidad.",
  "Analítica de volumen documental y actividad por período."
];

export default async function HomePage() {
  const session = await getSession();
  const primaryHref = session ? "/operaciones" : "/login";
  const primaryLabel = session ? "Entrar al dashboard" : "Iniciar sesión";

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <section className="bank-shell relative overflow-hidden p-6 md:p-10">
        <div className="pointer-events-none absolute -right-16 top-8 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-8 h-44 w-44 rounded-full bg-blue-300/20 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/70 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
              <Sparkles size={14} />
              One-page de producto
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Megafyle / Portal documental asistido por IA</p>
              <h1 className="mt-2 font-display text-4xl leading-tight text-slate-900 md:text-5xl">
                Contenido documental utilizable, buscable y gobernado
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                Megafyle centraliza operaciones y documentos, extrae datos con IA y permite búsqueda conversacional con evidencias.
                Diseñado para equipos de content management que necesitan velocidad, control y trazabilidad.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={primaryHref} className="bank-btn inline-flex items-center gap-2">
                {primaryLabel}
                <ArrowRight size={16} />
              </Link>
              <a href="#caracteristicas" className="bank-btn-secondary inline-flex items-center gap-2">
                Ver características
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Captura</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FolderUp size={16} className="text-cyan-600" />
                  PDF + imágenes + cámara
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Consulta</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileSearch size={16} className="text-cyan-600" />
                  Lenguaje natural con evidencia
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Control</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <LockKeyhole size={16} className="text-cyan-600" />
                  Permisos por tipo documental
                </p>
              </article>
            </div>
          </div>

          <div className="bank-card-dark relative overflow-hidden p-6 md:p-7">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Vista de valor para Content Management</p>
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                IA + Gobierno
              </span>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Problema habitual</p>
                <p className="mt-2 text-sm text-slate-100">
                  Archivos dispersos, metadatos inconsistentes y búsqueda lenta entre múltiples documentos por operación.
                </p>
              </div>
              <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">Qué aporta Megafyle</p>
                <p className="mt-2 text-sm text-slate-100">
                  Ingesta, extracción, consulta y reporting en un flujo único para capturadores y analistas.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-300">Búsqueda</p>
                  <p className="mt-1 text-sm font-semibold text-white">Chat + snippets + miniaturas</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-300">Reportes</p>
                  <p className="mt-1 text-sm font-semibold text-white">KPIs, gráficos, CSV/PDF</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="caracteristicas" className="mt-8">
        <div className="bank-card p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="bank-chip">Características</div>
              <h2 className="mt-3 font-display text-3xl text-slate-900">Qué puede hacer la aplicación hoy</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Funcionalidades enfocadas en captura, recuperación y análisis de contenido documental para operaciones y expedientes.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => {
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
          <div className="bank-chip">Beneficios</div>
          <h2 className="mt-3 font-display text-2xl text-slate-900">Valor para equipos de Content Management</h2>
          <ul className="mt-5 space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="bank-card p-6 md:p-7">
          <div className="bank-chip">Casos de uso</div>
          <h2 className="mt-3 font-display text-2xl text-slate-900">Dónde encaja mejor</h2>
          <div className="mt-5 grid gap-3">
            {contentUseCases.map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-800">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Flujo resumido</p>
            <p className="mt-2 text-sm text-blue-900">
              Captura documentos → IA extrae campos → analista consulta por prompt → reportes y exportables para seguimiento.
            </p>
          </div>
        </article>
      </section>

      <section className="mt-8">
        <article className="bank-shell p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
                <FileText size={14} />
                Resumen ejecutivo
              </div>
              <h2 className="mt-3 font-display text-2xl text-slate-900 md:text-3xl">
                Una capa de inteligencia sobre tu gestión documental operativa
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Megafyle combina captura documental, extracción IA, búsqueda asistida y reporting para transformar contenido operativo en
                información accesible y accionable.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href={primaryHref} className="bank-btn inline-flex items-center gap-2">
                {primaryLabel}
                <ArrowRight size={16} />
              </Link>
              <a href="#caracteristicas" className="bank-btn-secondary">
                Volver a características
              </a>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
