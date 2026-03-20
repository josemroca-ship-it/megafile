"use client";

import Image from "next/image";
import { jsPDF } from "jspdf";
import {
  ArrowLeft,
  ArrowRightLeft,
  Bot,
  Building2,
  ChartColumnBig,
  CheckCircle2,
  CreditCard,
  FileText,
  Headphones,
  Home,
  Landmark,
  MessageSquare,
  Mic,
  Receipt,
  Search,
  Send,
  Settings,
  ShieldCheck,
  UserCircle2,
  Wallet,
  UploadCloud
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type ChatMessage = {
  id: string;
  role: "agent" | "user";
  text: string;
};

type Stage = "upload" | "review" | "sign" | "done";
type View = "portal" | "assistant";
type PortalLang = "es" | "en";

type ExtractedSummary = {
  clientName: string;
  clientRut: string;
  operationType: string;
  currency: string;
  amount: string;
  incoterm: string;
  beneficiaryName: string;
};

type RecentTransaction = {
  id: string;
  date: string;
  conceptEs: string;
  conceptEn: string;
  account: string;
  amount: string;
  status: "completed" | "pending";
};

type LastProfileRow = {
  key: string;
  labelEs: string;
  labelEn: string;
  value: string;
};

const FALLBACK_EXTRACTED: ExtractedSummary = {
  clientName: "Importadora Andina SpA",
  clientRut: "76.555.321-8",
  operationType: "Carta de credito de importacion",
  currency: "USD",
  amount: "125000",
  incoterm: "FOB",
  beneficiaryName: "Shenzhen Industrial Parts Co."
};

const LAST_OPERATION_PROFILE_ROWS: LastProfileRow[] = [
  { key: "razonSocial", labelEs: "Razon social", labelEn: "Company name", value: "IMPORTADORA EL PUNTO DEL ARTE SAS" },
  { key: "tipoId", labelEs: "Tipo identificacion", labelEn: "ID type", value: "NIT" },
  { key: "idFiscal", labelEs: "No. identificacion", labelEn: "Tax ID", value: "900619408-4" },
  { key: "direccion", labelEs: "Direccion", labelEn: "Address", value: "CARRERA 13 15 45" },
  { key: "pais", labelEs: "Pais", labelEn: "Country", value: "COLOMBIA" },
  { key: "fechaSolicitud", labelEs: "Fecha solicitud", labelEn: "Request date", value: "2025/03/14" },
  { key: "cuenta", labelEs: "Cuenta cliente", labelEn: "Client account", value: "013269999658" }
];

const RECENT_TRANSACTIONS: RecentTransaction[] = [
  { id: "tx-09032026-1", date: "09/03/2026", conceptEs: "Pago proveedor internacional", conceptEn: "International supplier payment", account: "CTA-001245", amount: "- USD 24,500", status: "completed" },
  { id: "tx-08032026-1", date: "08/03/2026", conceptEs: "Cobro exportacion", conceptEn: "Export collection", account: "CTA-009921", amount: "+ USD 48,200", status: "completed" },
  { id: "tx-08032026-2", date: "08/03/2026", conceptEs: "Comision bancaria COMEX", conceptEn: "COMEX bank fee", account: "CTA-001245", amount: "- USD 320", status: "completed" },
  { id: "tx-07032026-1", date: "07/03/2026", conceptEs: "Transferencia intercompany", conceptEn: "Intercompany transfer", account: "CTA-003411", amount: "- EUR 12,800", status: "pending" },
  { id: "tx-06032026-1", date: "06/03/2026", conceptEs: "Liquidacion de divisas", conceptEn: "FX settlement", account: "CTA-009921", amount: "+ CLP 18,420,000", status: "completed" },
  { id: "tx-05032026-1", date: "05/03/2026", conceptEs: "Pago logistica maritima", conceptEn: "Ocean logistics payment", account: "CTA-001245", amount: "- USD 5,900", status: "completed" }
];

const KPI_CARDS = [
  { labelEs: "Saldo consolidado", labelEn: "Consolidated balance", value: "USD 4.8M", trendEs: "+3.2% vs mes anterior", trendEn: "+3.2% vs previous month" },
  { labelEs: "Pagos programados", labelEn: "Scheduled payments", value: "27", trendEs: "8 vencen hoy", trendEn: "8 due today" },
  { labelEs: "Operaciones COMEX", labelEn: "COMEX operations", value: "14", trendEs: "5 en curso", trendEn: "5 in progress" },
  { labelEs: "Riesgo cambiario", labelEn: "FX risk", value: "Bajo", trendEs: "Cobertura 82%", trendEn: "Coverage 82%" }
];

const SUGGESTED_QUESTIONS_ES = [
  "Como contacto al ejecutivo?",
  "Cual fue el monto de todas mis operaciones?",
  "Dime alguna oficina cerca",
  "Que debo revisar en una carta de credito?"
];

const SUGGESTED_QUESTIONS_EN = [
  "How do I contact my account executive?",
  "What is the total amount of all my operations?",
  "Can you suggest a nearby branch?",
  "What should I check in a letter of credit?"
];

const EXECUTIVE_CONTACT = {
  name: "Jose Maria Roca",
  phone: "+56 2 2890 4455"
};

const BANK_OFFICES_SCL = [
  { name: "Sucursal Apoquindo", address: "Av. Apoquindo 3450, Las Condes, Santiago", phone: "+56 2 2765 1101", tags: ["las condes", "apoquindo", "el golf"] },
  { name: "Sucursal Providencia", address: "Av. Providencia 1871, Providencia, Santiago", phone: "+56 2 2765 1102", tags: ["providencia", "manuel montt"] },
  { name: "Sucursal Santiago Centro", address: "Huérfanos 1020, Santiago Centro, Santiago", phone: "+56 2 2765 1103", tags: ["centro", "santiago centro", "plaza de armas"] },
  { name: "Sucursal Nunoa", address: "Av. Irarrazaval 2987, Nunoa, Santiago", phone: "+56 2 2765 1104", tags: ["nunoa", "irarrazaval"] },
  { name: "Sucursal Maipu", address: "Av. Pajaritos 3120, Maipu, Santiago", phone: "+56 2 2765 1105", tags: ["maipu", "pajaritos"] }
];

function summarizeTypes(files: File[]) {
  const buckets = new Map<string, number>();
  for (const file of files) {
    const type = file.type.includes("pdf") ? "PDF" : file.type.startsWith("image/") ? "Imagen" : "Otro";
    buckets.set(type, (buckets.get(type) || 0) + 1);
  }
  return Array.from(buckets.entries()).map(([label, count]) => `${count} ${label}`);
}

function extractSummaryFromFiles(files: File[], declaredAmount?: string | null): ExtractedSummary {
  const joinedNames = files.map((f) => f.name.toLowerCase()).join(" ");
  const inferredType = joinedNames.includes("invoice") || joinedNames.includes("factura")
    ? "Cobranza documentaria de importacion"
    : FALLBACK_EXTRACTED.operationType;

  const inferredCurrency = joinedNames.includes("eur") ? "EUR" : FALLBACK_EXTRACTED.currency;

  return {
    ...FALLBACK_EXTRACTED,
    operationType: inferredType,
    currency: inferredCurrency,
    amount: declaredAmount?.trim() || FALLBACK_EXTRACTED.amount
  };
}

function randomAccountNumber() {
  return `CTA-${Math.floor(100000 + Math.random() * 900000)}`;
}

function parseSignedAmount(raw: string) {
  const match = raw.match(/^([+-])\s*([A-Z]{3})\s*([\d.,]+)/);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const currency = match[2];
  const value = Number(match[3].replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  return { sign, currency, value };
}

function createInitialMessages(username: string, lang: PortalLang): ChatMessage[] {
  if (lang === "en") {
    return [
      {
        id: "welcome-1",
        role: "agent",
        text: `Hi ${username}, I am your smart COMEX operations advisor.`
      },
      {
        id: "welcome-2",
        role: "agent",
        text: "Do you want to use the data from your last operation?"
      }
    ];
  }
  return [
    {
      id: "welcome-1",
      role: "agent",
      text: `Hola ${username}, soy tu asesor inteligente de operaciones COMEX.`
    },
    {
      id: "welcome-2",
      role: "agent",
      text: "¿Quieres utilizar los datos de tu ultima operacion?"
    }
  ];
}

function buildComexAdvisorReply(question: string, lang: PortalLang, transactions: RecentTransaction[] = RECENT_TRANSACTIONS) {
  const q = question.toLowerCase();
  const en = lang === "en";
  const officeMatch = BANK_OFFICES_SCL.find((office) => office.tags.some((tag) => q.includes(tag))) ?? BANK_OFFICES_SCL[0];

  if (
    q.includes("ejecutivo") ||
    q.includes("contacto") ||
    q.includes("telefono") ||
    q.includes("llamar") ||
    q.includes("account executive")
  ) {
    return en
      ? `Your assigned executive is ${EXECUTIVE_CONTACT.name}. Direct phone: ${EXECUTIVE_CONTACT.phone}. Hours: Monday to Friday, 09:00 to 18:00.`
      : `Tu ejecutivo asignado es ${EXECUTIVE_CONTACT.name}. Telefono directo: ${EXECUTIVE_CONTACT.phone}. Horario: lunes a viernes, 09:00 a 18:00.`;
  }

  if (
    q.includes("monto de todas") ||
    q.includes("monto total") ||
    q.includes("todas mis operaciones") ||
    q.includes("total de mis operaciones") ||
    q.includes("total amount") ||
    q.includes("all my operations")
  ) {
    const totalsByCurrency = transactions.reduce<Record<string, { incoming: number; outgoing: number }>>((acc, tx) => {
      const parsed = parseSignedAmount(tx.amount);
      if (!parsed) return acc;
      if (!acc[parsed.currency]) {
        acc[parsed.currency] = { incoming: 0, outgoing: 0 };
      }
      if (parsed.sign >= 0) acc[parsed.currency].incoming += parsed.value;
      else acc[parsed.currency].outgoing += parsed.value;
      return acc;
    }, {});

    const rows = Object.entries(totalsByCurrency);
    if (!rows.length) {
      return en
        ? "I still do not have enough transaction data to calculate a total amount."
        : "Aun no tengo suficientes datos de transacciones para calcular un monto total.";
    }
    const detail = rows
      .map(([currency, totals]) => {
        const incoming = totals.incoming.toLocaleString(en ? "en-US" : "es-CL");
        const outgoing = totals.outgoing.toLocaleString(en ? "en-US" : "es-CL");
        const net = (totals.incoming - totals.outgoing).toLocaleString(en ? "en-US" : "es-CL");
        return en
          ? `${currency}: incoming ${incoming}, outgoing ${outgoing}, net ${net}`
          : `${currency}: ingresos ${incoming}, egresos ${outgoing}, neto ${net}`;
      })
      .join(" | ");
    return en
      ? `This is the consolidated amount of your operations: ${detail}.`
      : `Este es el consolidado de monto de tus operaciones: ${detail}.`;
  }

  if (q.includes("oficina") || q.includes("sucursal") || q.includes("cerca") || q.includes("branch")) {
    const additional = BANK_OFFICES_SCL.filter((office) => office.name !== officeMatch.name)
      .slice(0, 2)
      .map((office) => `${office.name}: ${office.address}`)
      .join(" | ");
    return en
      ? `Nearby branch suggestion: ${officeMatch.name}, ${officeMatch.address}. Phone: ${officeMatch.phone}. Other options: ${additional}.`
      : `Oficina sugerida cercana: ${officeMatch.name}, ${officeMatch.address}. Telefono: ${officeMatch.phone}. Otras opciones: ${additional}.`;
  }

  if (q.includes("incoterm")) {
    return en
      ? "To define Incoterms, validate freight/insurance responsibility and risk transfer point. In imports, FOB and CIF are most common."
      : "Para definir Incoterm, valida responsabilidad de flete/seguro y punto de transferencia de riesgo. En importacion, FOB y CIF son los mas usados.";
  }
  if (q.includes("carta de credito") || q.includes("letter of credit")) {
    return en
      ? "For a letter of credit, review issuing bank, validity, required documents and amount/date tolerances to avoid discrepancies."
      : "En carta de credito revisa banco emisor, vigencia, documentos requeridos y tolerancias de monto/fecha para evitar discrepancias.";
  }
  if (q.includes("swift")) {
    return en
      ? "The SWIFT code must match the beneficiary bank exactly. If it is wrong, transfers can be rejected or delayed."
      : "El codigo SWIFT debe coincidir exactamente con el banco beneficiario. Si hay error, la transferencia puede rechazarse o retrasarse.";
  }
  if (q.includes("plazo") || q.includes("tiempo") || q.includes("time")) {
    return en
      ? "As a reference, a COMEX operation usually takes 2 to 7 business days depending on document validation and correspondent bank flow."
      : "Como referencia, una operacion COMEX suele tardar entre 2 y 7 dias habiles dependiendo de validacion documental y banco corresponsal.";
  }
  return en
    ? "I can help with Incoterms, letters of credit, required documents, timing and bank validations for foreign trade operations."
    : "Puedo ayudarte con Incoterms, carta de credito, documentos requeridos, tiempos y validaciones bancarias de operaciones de comercio exterior.";
}

export function ComexDemoAssistant({ username = "Cliente" }: { username?: string }) {
  const [portalLang, setPortalLang] = useState<PortalLang>("es");
  const [view, setView] = useState<View>("portal");
  const [stage, setStage] = useState<Stage>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [extractedSummary, setExtractedSummary] = useState<ExtractedSummary | null>(null);
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(null);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentTyping, setAgentTyping] = useState(false);
  const [showLastOperationProfile, setShowLastOperationProfile] = useState(false);
  const [reusePromptAnswered, setReusePromptAnswered] = useState(false);
  const [loadingLastOperationData, setLoadingLastOperationData] = useState(false);
  const [operationAmountInput, setOperationAmountInput] = useState("");
  const [confirmedOperationAmount, setConfirmedOperationAmount] = useState<string | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>(RECENT_TRANSACTIONS);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceOfferAnswered, setVoiceOfferAnswered] = useState(false);
  const [voiceConversationEnabled, setVoiceConversationEnabled] = useState(false);
  const [listeningVoiceChat, setListeningVoiceChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatRecognitionRef = useRef<any>(null);
  const voiceContinuousRef = useRef(false);
  const agentSpeakingRef = useRef(false);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioUrlRef = useRef<string | null>(null);
  const reuseTimeoutRef = useRef<number | null>(null);
  const introTimersRef = useRef<number[]>([]);
  const drawingRef = useRef(false);
  const [hasSignatureStroke, setHasSignatureStroke] = useState(false);

  const t = portalLang === "en"
    ? {
        welcome: "Welcome",
        corpBanking: "Business Banking",
        home: "Home",
        accounts: "Accounts",
        transactions: "Transactions",
        payments: "Payments",
        cards: "Cards",
        portfolio: "Portfolio",
        comexOps: "COMEX Operations",
        comexEntry: "Enter with smart advisor",
        support: "Support",
        settings: "Settings",
        searchPortal: "Search in portal...",
        transferMoney: "Transfer money",
        heroTitle: "Agile and simple business banking",
        heroText: "Manage accounts, payments and international operations from one single dashboard.",
        learnMore: "Learn more",
        latestTx: "Latest transactions",
        sevenDays: "7 days",
        date: "Date",
        concept: "Concept",
        account: "Account",
        amount: "Amount",
        status: "Status",
        completed: "Completed",
        pending: "Pending",
        backPortal: "Back to portal",
        smartAgentComex: "Smart COMEX Agent",
        selectFiles: "Select or drag files",
        filesReady: "file(s) ready to send",
        uploadCreate: "Uploading and creating operation...",
        extracting: "Extracting information...",
        sendDocs: "Send documents",
        generatingContract: "Generating PDF contract...",
        generateContract: "Generate contract for signature",
        signQuestion: "Do you want to sign the contract?",
        signNow: "Yes, sign now",
        notNow: "Not now",
        drawSignature: "Draw signature",
        clearSignature: "Clear signature",
        signRequired: "Please draw your signature before signing.",
        signatureHelp: "Use your mouse or touch to draw your signature.",
        processingAi: "Processing AI...",
        processingAiHint: "It may take a few seconds depending on file count and size.",
        operationDone: "Operation completed and contract signed on",
        askAdvisor: "Ask the advisor about foreign trade",
        askPlaceholder: "Example: what should I check in a letter of credit?",
        summaryExtracted: "Extracted summary",
        lastDataSummary: "Last operation client profile",
        reuseQuestion: "Do you want to use the data from your last operation?",
        reuseYes: "Yes, use previous data",
        reuseNo: "No, continue without previous data",
        amountPromptTitle: "Enter the transaction amount before uploading documents",
        amountPromptHint: "This amount will be included in the summary and contract.",
        amountLabel: "Transaction amount",
        amountPlaceholder: "Example: 125000",
        confirmAmount: "Confirm amount",
        amountRequiredError: "Enter a valid transaction amount to continue.",
        amountRegistered: "Amount registered. You can now upload the transaction documents.",
        summaryEmpty: "No extracted information yet. Upload files to generate summary.",
        loadedDocs: "Uploaded documents",
        noDocs: "No uploaded files.",
        remove: "Remove",
        contract: "Contract",
        contractPending: "It will be generated once you confirm the summary.",
        flowState: "Flow status",
        flowUpload: "Waiting for document upload",
        flowReview: "Summary generated, pending confirmation",
        flowSign: "Contract ready for signature",
        flowDone: "Process completed",
        docsReceived: "Documents received, now I will generate the contract for signature and delivery.",
        preliminarySummary: "You can now review the preliminary summary and generate the contract without waiting for AI to complete."
      }
    : {
        welcome: "Bienvenido",
        corpBanking: "Banca Empresas",
        home: "Inicio",
        accounts: "Cuentas",
        transactions: "Transacciones",
        payments: "Pagos",
        cards: "Tarjetas",
        portfolio: "Portafolio",
        comexOps: "Operaciones COMEX",
        comexEntry: "Entrar con asesor inteligente",
        support: "Soporte",
        settings: "Configuración",
        searchPortal: "Buscar en el portal...",
        transferMoney: "Transferir dinero",
        heroTitle: "Banca empresa ágil y sencilla",
        heroText: "Gestiona cuentas, pagos y operaciones internacionales en un solo panel con control total de tu tesorería.",
        learnMore: "Ver más",
        latestTx: "Últimas transacciones",
        sevenDays: "7 días",
        date: "Fecha",
        concept: "Concepto",
        account: "Cuenta",
        amount: "Monto",
        status: "Estado",
        completed: "Completada",
        pending: "Pendiente",
        backPortal: "Volver al portal",
        smartAgentComex: "Agente inteligente COMEX",
        selectFiles: "Seleccionar o arrastrar archivos",
        filesReady: "archivo(s) listos para enviar",
        uploadCreate: "Subiendo y creando operacion...",
        extracting: "Extrayendo informacion...",
        sendDocs: "Enviar documentos",
        generatingContract: "Generando contrato PDF...",
        generateContract: "Generar contrato para firma",
        signQuestion: "¿Quiere firmar el contrato?",
        signNow: "Si, firmar ahora",
        notNow: "No por ahora",
        drawSignature: "Dibujar firma",
        clearSignature: "Limpiar firma",
        signRequired: "Por favor, dibuje su firma antes de firmar.",
        signatureHelp: "Use el mouse o el dedo para dibujar su firma.",
        processingAi: "Procesando IA...",
        processingAiHint: "Puede tardar algunos segundos segun cantidad y peso de documentos.",
        operationDone: "Operacion finalizada y contrato firmado el",
        askAdvisor: "Consultar al asesor sobre comercio exterior",
        askPlaceholder: "Ej: que revisar en una carta de credito?",
        summaryExtracted: "Resumen extraido",
        lastDataSummary: "Datos de cliente de la ultima operacion",
        reuseQuestion: "¿Quieres utilizar los datos de tu ultima operacion?",
        reuseYes: "Si, usar datos anteriores",
        reuseNo: "No, continuar sin datos previos",
        amountPromptTitle: "Indica el monto de la operacion antes de subir documentos",
        amountPromptHint: "Este monto se usara en el resumen y en el contrato.",
        amountLabel: "Monto de la operacion",
        amountPlaceholder: "Ejemplo: 125000",
        confirmAmount: "Confirmar monto",
        amountRequiredError: "Ingresa un monto valido para continuar.",
        amountRegistered: "Monto registrado. Ya puedes subir los documentos de la transaccion.",
        summaryEmpty: "Aun no hay informacion extraida. Sube los archivos para generar el resumen.",
        loadedDocs: "Documentos cargados",
        noDocs: "Sin archivos cargados.",
        remove: "Quitar",
        contract: "Contrato",
        contractPending: "Se generara cuando confirmes el resumen.",
        flowState: "Estado del flujo",
        flowUpload: "Esperando carga documental",
        flowReview: "Resumen generado, pendiente confirmacion",
        flowSign: "Contrato listo para firma",
        flowDone: "Proceso completado",
        docsReceived: "Documentos recibidos, ahora generaré el contrato para su firma y envío.",
        preliminarySummary: "Ya puedes revisar el resumen preliminar y generar el contrato sin esperar a que finalice la IA."
      };

  const suggestedQuestions = portalLang === "en" ? SUGGESTED_QUESTIONS_EN : SUGGESTED_QUESTIONS_ES;

  useEffect(() => {
    if (view !== "assistant") return;
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, view]);

  useEffect(() => {
    return () => {
      clearIntroTimers();
      if (reuseTimeoutRef.current !== null) {
        window.clearTimeout(reuseTimeoutRef.current);
      }
      if (contractPdfUrl) URL.revokeObjectURL(contractPdfUrl);
      if (chatRecognitionRef.current) {
        try {
          chatRecognitionRef.current.stop();
        } catch {
          // noop
        }
      }
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      if (ttsAudioUrlRef.current) {
        URL.revokeObjectURL(ttsAudioUrlRef.current);
        ttsAudioUrlRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [contractPdfUrl]);

  useEffect(() => {
    if (stage !== "sign") return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = Math.max(280, Math.floor(canvas.clientWidth || 480));
    const cssHeight = 130;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setHasSignatureStroke(false);
  }, [stage]);

  const speakAgentResponse = useCallback(async (text: string) => {
    if (typeof window === "undefined" || !voiceConversationEnabled || !("speechSynthesis" in window)) return;
    const normalizedText = text.replace(/[^\p{L}\p{N}\s.,:;!?()-]/gu, " ").trim();
    const resumeContinuousVoice = () => {
      if (!voiceConversationEnabled || !voiceContinuousRef.current || !chatRecognitionRef.current) return;
      try {
        setListeningVoiceChat(true);
        chatRecognitionRef.current.start();
      } catch {
        setListeningVoiceChat(false);
      }
    };

    try {
      agentSpeakingRef.current = true;
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      if (ttsAudioUrlRef.current) {
        URL.revokeObjectURL(ttsAudioUrlRef.current);
        ttsAudioUrlRef.current = null;
      }

      const ttsResponse = await fetch("/api/portalcliente/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: normalizedText, voice: "alloy" })
      });
      if (ttsResponse.ok) {
        const audioBlob = await ttsResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        ttsAudioUrlRef.current = audioUrl;
        const audio = new Audio(audioUrl);
        ttsAudioRef.current = audio;
        audio.onended = () => {
          agentSpeakingRef.current = false;
          if (ttsAudioUrlRef.current) {
            URL.revokeObjectURL(ttsAudioUrlRef.current);
            ttsAudioUrlRef.current = null;
          }
          ttsAudioRef.current = null;
          resumeContinuousVoice();
        };
        audio.onerror = () => {
          agentSpeakingRef.current = false;
          if (ttsAudioUrlRef.current) {
            URL.revokeObjectURL(ttsAudioUrlRef.current);
            ttsAudioUrlRef.current = null;
          }
          ttsAudioRef.current = null;
        };
        await audio.play();
        return;
      }
    } catch {
      // Fallback to browser speech synthesis below.
    }

    const voices = window.speechSynthesis.getVoices();
    if (!selectedVoiceRef.current && voices.length > 0) {
      const preferred =
        voices.find((voice) => voice.lang.toLowerCase().startsWith("es-cl") && /neural|natural|premium|google|microsoft/i.test(voice.name)) ??
        voices.find((voice) => voice.lang.toLowerCase().startsWith("es-cl")) ??
        voices.find((voice) => voice.lang.toLowerCase().startsWith("en-us") && /neural|natural|premium|google|microsoft/i.test(voice.name)) ??
        voices.find((voice) => voice.lang.toLowerCase().startsWith("es")) ??
        voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
        null;
      selectedVoiceRef.current = preferred;
    }

    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.lang = selectedVoiceRef.current?.lang || (portalLang === "en" ? "en-US" : "es-CL");
    utterance.rate = 1.02;
    utterance.pitch = 1;
    if (selectedVoiceRef.current) utterance.voice = selectedVoiceRef.current;
    utterance.onstart = () => {
      agentSpeakingRef.current = true;
    };
    utterance.onend = () => {
      agentSpeakingRef.current = false;
      resumeContinuousVoice();
    };
    utterance.onerror = () => {
      agentSpeakingRef.current = false;
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [portalLang, voiceConversationEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      return;
    }
    setSpeechSupported(true);
    const chatRecognition = new SpeechRecognitionCtor();
    chatRecognition.lang = portalLang === "en" ? "en-US" : "es-CL";
    chatRecognition.interimResults = false;
    chatRecognition.maxAlternatives = 1;
    chatRecognition.onresult = (event: any) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript ?? "").trim();
      if (!transcript) {
        setListeningVoiceChat(false);
        return;
      }
      const normalizedTranscript = transcript.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const wantsToStop = /\b(gracias|no gracias|eso es todo|nada mas|adios|hasta luego|thank you|thanks|no thanks|that is all|nothing else|bye)\b/.test(normalizedTranscript);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: `🎙️ ${transcript}` }]);
      if (wantsToStop) {
        voiceContinuousRef.current = false;
        setVoiceConversationEnabled(false);
        setVoiceOfferAnswered(true);
        setListeningVoiceChat(false);
        const bye = portalLang === "en"
          ? "Perfect. Closing voice conversation. If you need anything else, I am here."
          : "Perfecto. Cerramos la conversación por voz. Si necesitas algo más, aquí estaré.";
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "agent", text: `✅ ${bye}` }]);
        return;
      }

      const answer = buildComexAdvisorReply(transcript, portalLang, recentTransactions);
      const followup = portalLang === "en"
        ? `${answer} Can I help you with anything else?`
        : `${answer} ¿Te puedo ayudar en algo más?`;
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "agent", text: `🤖 ${followup}` }]);
      speakAgentResponse(followup);
    };
    chatRecognition.onerror = () => {
      setListeningVoiceChat(false);
      addAgentMessage(portalLang === "en" ? "⚠️ I could not capture your voice question. Please try again." : "⚠️ No pude captar tu pregunta por voz. Inténtalo de nuevo.");
    };
    chatRecognition.onend = () => {
      setListeningVoiceChat(false);
      if (!voiceConversationEnabled || !voiceContinuousRef.current || agentSpeakingRef.current) return;
      try {
        setListeningVoiceChat(true);
        chatRecognition.start();
      } catch {
        setListeningVoiceChat(false);
      }
    };
    chatRecognitionRef.current = chatRecognition;

    return () => {
      try {
        chatRecognition.stop();
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      } catch {
        // noop
      }
      chatRecognitionRef.current = null;
    };
  }, [portalLang, recentTransactions, speakAgentResponse, voiceConversationEnabled]);

  const totalSizeMb = useMemo(() => files.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024), [files]);
  const typeSummary = useMemo(() => summarizeTypes(files), [files]);

  const contractText = extractedSummary
    ? `CONTRATO DE APERTURA OPERACION COMEX

Fecha: ${new Date().toLocaleString("es-CL")}
Operacion ID Megafyle: ${operationId ?? "Pendiente"}
Cliente: ${extractedSummary.clientName}
RUT/ID: ${extractedSummary.clientRut}
Tipo: ${extractedSummary.operationType}
Moneda: ${extractedSummary.currency}
Monto: ${extractedSummary.amount}
Incoterm: ${extractedSummary.incoterm}
Beneficiario: ${extractedSummary.beneficiaryName}

El cliente declara que la informacion y documentos son validos para iniciar la operacion COMEX.`
    : "";

  function addUserMessage(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
  }

  function addAgentMessage(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "agent", text }]);
  }

  function clearIntroTimers() {
    for (const timerId of introTimersRef.current) {
      window.clearTimeout(timerId);
    }
    introTimersRef.current = [];
  }

  function playIntroConversation() {
    clearIntroTimers();
    setMessages([]);
    const introMessages = createInitialMessages(username, portalLang);
    if (introMessages.length === 0) return;

    setAgentTyping(true);
    let elapsed = 280;
    introMessages.forEach((message, index) => {
      elapsed += message.role === "agent" ? 820 : 520;
      const isLast = index === introMessages.length - 1;
      const timer = window.setTimeout(() => {
        setMessages((prev) => [...prev, { ...message, id: `intro-${index}-${crypto.randomUUID()}` }]);
        if (isLast) setAgentTyping(false);
      }, elapsed);
      introTimersRef.current.push(timer);
    });
  }

  function advisorReply(question: string) {
    return buildComexAdvisorReply(question, portalLang, recentTransactions);
  }

  function sendChatQuestion() {
    const question = chatInput.trim();
    if (!question) return;
    addUserMessage(question);
    setChatInput("");
    const answer = advisorReply(question);
    addAgentMessage(answer);
    speakAgentResponse(answer);
  }

  function askSuggested(question: string) {
    setChatInput(question);
    window.setTimeout(() => {
      addUserMessage(question);
      setChatInput("");
      const answer = advisorReply(question);
      addAgentMessage(answer);
      speakAgentResponse(answer);
    }, 50);
  }

  function enableVoiceConversation() {
    setVoiceOfferAnswered(true);
    setVoiceConversationEnabled(true);
    voiceContinuousRef.current = true;
    addUserMessage(portalLang === "en" ? "Yes, I want to talk by voice." : "Sí, quiero conversar por voz.");
    addAgentMessage(portalLang === "en" ? "🎙️ Great. Ask your question by voice and I will answer by voice." : "🎙️ Perfecto. Haz tu pregunta por voz y te responderé también con voz.");
    window.setTimeout(() => {
      if (!chatRecognitionRef.current) return;
      try {
        setListeningVoiceChat(true);
        chatRecognitionRef.current.start();
      } catch {
        setListeningVoiceChat(false);
      }
    }, 300);
  }

  function declineVoiceConversation() {
    setVoiceOfferAnswered(true);
    setVoiceConversationEnabled(false);
    voiceContinuousRef.current = false;
    try {
      chatRecognitionRef.current?.stop();
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      if (ttsAudioUrlRef.current) {
        URL.revokeObjectURL(ttsAudioUrlRef.current);
        ttsAudioUrlRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    } catch {
      // noop
    }
    addUserMessage(portalLang === "en" ? "No, thanks." : "No, gracias.");
  }

  function startVoiceChatCapture() {
    if (!speechSupported || !chatRecognitionRef.current || listeningVoiceChat || !voiceConversationEnabled) return;
    setError(null);
    setListeningVoiceChat(true);
    try {
      chatRecognitionRef.current.start();
    } catch {
      setListeningVoiceChat(false);
      setError(portalLang === "en" ? "Could not start voice conversation. Please try again." : "No fue posible iniciar la conversación por voz. Intenta nuevamente.");
    }
  }

  function answerReusePrompt(usePreviousData: boolean) {
    if (reusePromptAnswered || loadingLastOperationData) return;
    clearIntroTimers();
    setAgentTyping(false);
    setReusePromptAnswered(true);

    if (usePreviousData) {
      addUserMessage(t.reuseYes);
      addAgentMessage(portalLang === "en" ? "Great, checking your last operation now..." : "Perfecto, consultando la ultima operacion...");
      setLoadingLastOperationData(true);
      reuseTimeoutRef.current = window.setTimeout(() => {
        setShowLastOperationProfile(true);
        setLoadingLastOperationData(false);
        addAgentMessage(
          portalLang === "en"
            ? "Done. I loaded your customer profile data. Please enter the transaction amount to continue."
            : "Listo. Cargue los datos del cliente. Indica el monto de la operacion para continuar."
        );
      }, 700);
      return;
    }

    addUserMessage(t.reuseNo);
    addAgentMessage(
      portalLang === "en"
        ? "Understood. Enter the transaction amount and then upload your files to continue from scratch."
        : "Entendido. Indica el monto de la operacion y luego sube los archivos para continuar desde cero."
    );
  }

  function confirmOperationAmount() {
    const normalized = operationAmountInput.trim();
    if (!/[0-9]/.test(normalized)) {
      setError(t.amountRequiredError);
      return;
    }
    setError(null);
    setConfirmedOperationAmount(normalized);
    addUserMessage(`${t.amountLabel}: ${normalized}`);
    addAgentMessage(t.amountRegistered);
  }

  async function logoAsDataUrl(path: string) {
    return new Promise<string>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No fue posible preparar el logo"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("No fue posible cargar el logo"));
      img.src = path;
    });
  }

  function pointerPosition(canvas: HTMLCanvasElement, e: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function startSignature(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = pointerPosition(canvas, e);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setHasSignatureStroke(true);
  }

  function moveSignature(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = pointerPosition(canvas, e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function endSignature() {
    drawingRef.current = false;
  }

  function clearSignature() {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    setHasSignatureStroke(false);
  }

  async function buildContractPdf(signatureDataUrl?: string | null) {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const logoData = await logoAsDataUrl("/nexa-logo.svg");
    pdf.addImage(logoData, "PNG", 40, 24, 180, 52);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Contrato de apertura operacion COMEX", 40, 98);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    const lines = pdf.splitTextToSize(contractText, 515);
    pdf.text(lines, 40, 122);

    if (signatureDataUrl) {
      pdf.setDrawColor(190, 198, 211);
      pdf.line(40, 728, 240, 728);
      pdf.setFontSize(9.5);
      pdf.text(portalLang === "en" ? "Customer signature" : "Firma cliente", 40, 742);
      pdf.addImage(signatureDataUrl, "PNG", 40, 664, 200, 58);
    }

    return pdf.output("blob");
  }

  function onPickFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [`${f.name}-${f.size}-${f.lastModified}`, f]));
      for (const file of incoming) map.set(`${file.name}-${file.size}-${file.lastModified}`, file);
      return Array.from(map.values());
    });
  }

  function removeFile(target: File) {
    setFiles((prev) => prev.filter((f) => !(f.name === target.name && f.size === target.size && f.lastModified === target.lastModified)));
  }

  async function submitDocuments() {
    setError(null);
    if (!confirmedOperationAmount) {
      setError(t.amountRequiredError);
      return;
    }
    if (files.length === 0) {
      setError("Sube al menos un archivo para continuar.");
      return;
    }

    try {
      setUploading(true);
      addUserMessage(portalLang === "en" ? `I uploaded ${files.length} file(s) for the transaction.` : `Subi ${files.length} archivo(s) para la transaccion.`);

      const payload = new FormData();
      payload.set("clientName", FALLBACK_EXTRACTED.clientName);
      payload.set("clientRut", FALLBACK_EXTRACTED.clientRut);
      payload.set("declaredAmount", confirmedOperationAmount);
      files.forEach((file) => payload.append("documents", file));

      const response = await fetch("/api/portalcliente/operations", {
        method: "POST",
        body: payload
      });
      const data = (await response.json().catch(() => null)) as { error?: string; operationId?: string } | null;

      if (!response.ok || !data?.operationId) {
        setError(data?.error || (portalLang === "en" ? "Could not create the operation." : "No fue posible crear la operacion."));
        setUploading(false);
        return;
      }

      setOperationId(data.operationId);
      setUploading(false);
      setExtracting(true);
      addAgentMessage(t.docsReceived);

      void fetch("/api/portalcliente/operations/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ operationId: data.operationId })
      }).catch(() => null);

      const summary = extractSummaryFromFiles(files, confirmedOperationAmount);
      setExtractedSummary(summary);
      setShowLastOperationProfile(false);
      setStage("review");
      setExtracting(false);
      addAgentMessage(t.preliminarySummary);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Error inesperado";
      setError(message);
      setUploading(false);
      setExtracting(false);
    }
  }

  async function generateContract() {
    if (!extractedSummary) {
      setError(portalLang === "en" ? "No extracted information available to generate the contract." : "No hay informacion extraida para generar el contrato.");
      return;
    }

    setGeneratingContract(true);
    setError(null);
    addUserMessage(portalLang === "en" ? "Generate contract." : "Generar contrato.");

    try {
      const blob = await buildContractPdf();
      const url = URL.createObjectURL(blob);
      if (contractPdfUrl) URL.revokeObjectURL(contractPdfUrl);
      setContractPdfUrl(url);
      setStage("sign");
      addAgentMessage(portalLang === "en" ? "PDF contract generated successfully. You can preview it now for signature." : "Contrato PDF generado correctamente. Lo tienes en vista previa para firma.");
      addAgentMessage(t.signQuestion);
    } catch (pdfError) {
      const message = pdfError instanceof Error ? pdfError.message : portalLang === "en" ? "Could not generate the PDF." : "No fue posible generar el PDF";
      setError(message);
    } finally {
      setGeneratingContract(false);
    }
  }

  function signContract() {
    if (!hasSignatureStroke || !signatureCanvasRef.current) {
      setError(t.signRequired);
      return;
    }
    setError(null);
    const signatureDataUrl = signatureCanvasRef.current.toDataURL("image/png");
    setGeneratingContract(true);
    void buildContractPdf(signatureDataUrl)
      .then(async (blob) => {
        const url = URL.createObjectURL(blob);
        if (contractPdfUrl) URL.revokeObjectURL(contractPdfUrl);
        setContractPdfUrl(url);
        const timestamp = new Date().toISOString();
        let attachmentError: string | null = null;
        if (operationId) {
          try {
            const signedFile = new File([blob], `contrato-comex-firmado-${operationId}.pdf`, {
              type: "application/pdf"
            });
            const form = new FormData();
            form.set("file", signedFile);
            form.set("signedAt", timestamp);
            const response = await fetch(`/api/portalcliente/operations/${operationId}/signed-contract`, {
              method: "POST",
              body: form
            });
            if (!response.ok) {
              const data = (await response.json().catch(() => null)) as { error?: string } | null;
              attachmentError =
                data?.error ||
                (portalLang === "en"
                  ? "The signed contract could not be attached to the operation."
                  : "No fue posible adjuntar el contrato firmado a la operacion.");
            }
          } catch {
            attachmentError =
              portalLang === "en"
                ? "The signed contract could not be attached to the operation."
                : "No fue posible adjuntar el contrato firmado a la operacion.";
          }
        }
        setSignedAt(timestamp);
        setStage("done");
        const txAmount = confirmedOperationAmount ?? extractedSummary?.amount ?? FALLBACK_EXTRACTED.amount;
        const txCurrency = extractedSummary?.currency ?? FALLBACK_EXTRACTED.currency;
        const txDate = new Date().toLocaleDateString(portalLang === "en" ? "en-US" : "es-CL");
        setRecentTransactions((prev) => [
          {
            id: `tx-comex-${crypto.randomUUID()}`,
            date: txDate,
            conceptEs: "Operacion COMEX firmada",
            conceptEn: "Signed COMEX operation",
            account: randomAccountNumber(),
            amount: `- ${txCurrency} ${txAmount}`,
            status: "completed"
          },
          ...prev
        ]);
        addUserMessage(portalLang === "en" ? "Sign contract." : "Firmar contrato.");
        addAgentMessage(
          portalLang === "en"
            ? "Signature validated. COMEX operation completed successfully. Is there anything else I can help you with? 😊"
            : "Firma validada. Operacion COMEX finalizada correctamente. ¿Hay algo mas que te pueda ayudar? 😊"
        );
        if (attachmentError) {
          setError(attachmentError);
        }
      })
      .catch(() => {
        setError(portalLang === "en" ? "Could not apply signature to PDF." : "No fue posible incrustar la firma en el PDF.");
      })
      .finally(() => setGeneratingContract(false));
  }

  function resetAssistantState() {
    setStage("upload");
    setFiles([]);
    setOperationId(null);
    setUploading(false);
    setExtracting(false);
    setDragActive(false);
    setError(null);
    setSignedAt(null);
    setExtractedSummary(null);
    if (contractPdfUrl) URL.revokeObjectURL(contractPdfUrl);
    setContractPdfUrl(null);
    setGeneratingContract(false);
    setHasSignatureStroke(false);
    setChatInput("");
    setAgentTyping(false);
    clearIntroTimers();
    if (reuseTimeoutRef.current !== null) {
      window.clearTimeout(reuseTimeoutRef.current);
      reuseTimeoutRef.current = null;
    }
    setReusePromptAnswered(false);
    setLoadingLastOperationData(false);
    setShowLastOperationProfile(false);
    setOperationAmountInput("");
    setConfirmedOperationAmount(null);
    setMessages([]);
    setVoiceOfferAnswered(false);
    setVoiceConversationEnabled(false);
    setListeningVoiceChat(false);
    voiceContinuousRef.current = false;
    try {
      chatRecognitionRef.current?.stop();
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      if (ttsAudioUrlRef.current) {
        URL.revokeObjectURL(ttsAudioUrlRef.current);
        ttsAudioUrlRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // noop
    }
  }

  function openComexAssistant() {
    resetAssistantState();
    setView("assistant");
    playIntroConversation();
  }

  if (view === "portal") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1480px] px-4 py-6 md:px-8 md:py-8">
        <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur">
          <div className="grid min-h-[82vh] lg:grid-cols-[250px_1fr]">
            <aside className="flex h-full flex-col border-r border-slate-200/90 bg-[#f8f9ff]">
              <div className="border-b border-slate-200/90 px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#2a2f5e] p-2">
                    <Building2 size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Nexa</p>
                    <p className="text-xs text-slate-500">{t.corpBanking}</p>
                  </div>
                </div>
              </div>

              <nav className="space-y-1 px-3 py-5">
                <button type="button" className="flex w-full items-center gap-2 rounded-xl bg-[#eef0ff] px-3 py-2.5 text-left text-sm font-semibold text-[#4f46e5]">
                  <Home size={16} />
                  {t.home}
                </button>
                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100">
                  <Wallet size={16} />
                  {t.accounts}
                </button>
                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100">
                  <Receipt size={16} />
                  {t.transactions}
                </button>
                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100">
                  <ArrowRightLeft size={16} />
                  {t.payments}
                </button>
                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100">
                  <CreditCard size={16} />
                  {t.cards}
                </button>
                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100">
                  <ChartColumnBig size={16} />
                  {t.portfolio}
                </button>
                <button
                  type="button"
                  onClick={openComexAssistant}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-[#7c7cf7] bg-gradient-to-r from-[#eef0ff] to-[#e5f5ff] px-3 py-2.5 text-left text-sm font-semibold text-[#3730a3] shadow-sm hover:brightness-105"
                >
                  <Landmark size={16} />
                  {t.comexOps}
                </button>
              </nav>

              <div className="mt-auto space-y-1 border-t border-slate-200/90 px-3 py-4">
                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                  <Headphones size={16} />
                  {t.support}
                </button>
                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                  <Settings size={16} />
                  {t.settings}
                </button>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <UserCircle2 size={18} className="text-slate-500" />
                  <span className="text-sm font-medium text-slate-800">{username}</span>
                </div>
              </div>
            </aside>

            <div className="space-y-5 bg-[#fcfcff] px-5 py-5 md:px-7">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-3xl font-semibold text-slate-900">{t.welcome}, {username}</p>
                  <p className="text-sm text-slate-500">NexaBank Corporate Group</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                    <input
                      className="w-64 rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                      placeholder={t.searchPortal}
                    />
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30">
                    <Send size={14} />
                    {t.transferMoney}
                  </button>
                  <div className="ml-1 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white p-1 text-xs font-semibold">
                    <button
                      type="button"
                      className={`rounded-full px-2 py-1 ${portalLang === "es" ? "bg-slate-900 text-white" : "text-slate-700"}`}
                      onClick={() => setPortalLang("es")}
                    >
                      ES
                    </button>
                    <button
                      type="button"
                      className={`rounded-full px-2 py-1 ${portalLang === "en" ? "bg-slate-900 text-white" : "text-slate-700"}`}
                      onClick={() => setPortalLang("en")}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </header>

              <section className="relative overflow-hidden rounded-[28px] border border-[#e8e5ff] bg-gradient-to-r from-[#e7effe] via-[#ebe7fb] to-[#ffece0] p-8">
                <div className="relative z-10 max-w-xl">
                  <p className="text-5xl font-semibold leading-tight text-[#12123f]">{t.heroTitle}</p>
                  <p className="mt-3 text-base text-slate-700">
                    {t.heroText}
                  </p>
                  <button type="button" className="mt-5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow">
                    {t.learnMore}
                  </button>
                </div>
                <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-200/70 to-indigo-300/70 blur-2xl" />
                <div className="pointer-events-none absolute bottom-0 right-16 h-44 w-44 rounded-full border border-white/70 bg-white/35 backdrop-blur" />
              </section>

              <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">{t.latestTx}</h3>
                    <span className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500">{t.sevenDays}</span>
                  </div>
                  <div className="overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.08em] text-slate-500">
                          <th className="px-2 py-2 font-semibold">{t.date}</th>
                          <th className="px-2 py-2 font-semibold">{t.concept}</th>
                          <th className="px-2 py-2 font-semibold">{t.account}</th>
                          <th className="px-2 py-2 font-semibold">{t.amount}</th>
                          <th className="px-2 py-2 font-semibold">{t.status}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTransactions.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="px-2 py-2 text-slate-600">{item.date}</td>
                            <td className="px-2 py-2 font-medium text-slate-900">{portalLang === "en" ? item.conceptEn : item.conceptEs}</td>
                            <td className="px-2 py-2 text-slate-600">{item.account}</td>
                            <td className={`px-2 py-2 font-semibold ${item.amount.startsWith("+") ? "text-emerald-700" : "text-slate-800"}`}>
                              {item.amount}
                            </td>
                            <td className="px-2 py-2">
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                {item.status === "completed" ? t.completed : t.pending}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <aside className="space-y-3">
                  {KPI_CARDS.map((kpi) => (
                    <article key={`${kpi.labelEs}-${kpi.value}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{portalLang === "en" ? kpi.labelEn : kpi.labelEs}</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">{kpi.value}</p>
                      <p className="mt-1 text-xs text-indigo-600">{portalLang === "en" ? kpi.trendEn : kpi.trendEs}</p>
                    </article>
                  ))}
                </aside>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <section className="bank-card overflow-hidden p-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <Image src="/nexa-logo.svg" alt="Nexa" width={180} height={48} priority />
            <div>
              <p className="text-lg font-semibold text-slate-900">Nexa</p>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Operaciones COMEX</p>
              <p className="text-sm text-slate-600">{portalLang === "en" ? "Smart advisor" : "Asesor inteligente"}</p>
            </div>
          </div>
          <button type="button" className="bank-btn-ghost inline-flex items-center gap-2" onClick={() => setView("portal")}>
            <ArrowLeft size={14} />
            {t.backPortal}
          </button>
        </header>

        <div className="grid gap-0 lg:grid-cols-[1.45fr_1fr]">
          <article className="flex h-[78vh] min-h-[620px] flex-col border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <MessageSquare size={16} className="text-cyan-700" />
              <p className="text-sm font-semibold text-slate-900">{t.smartAgentComex}</p>
            </div>

            <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-auto p-4 scroll-smooth">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${
                    message.role === "agent"
                      ? "border border-cyan-200 bg-cyan-50 text-slate-800"
                      : "ml-auto border border-slate-200 bg-white text-slate-900"
                  }`}
                  style={{ animation: "chatIn 300ms ease-out" }}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {message.role === "agent" ? (
                      <span className="inline-flex items-center gap-1">
                        <Bot size={11} />
                        Asesor IA
                      </span>
                    ) : (
                      "Cliente"
                    )}
                  </p>
                  <p>{message.text}</p>
                </div>
              ))}
              {agentTyping && (
                <div className="max-w-[92%] rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-slate-800">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Bot size={11} />
                      Asesor IA
                    </span>
                  </p>
                  <div className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-700 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-700 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-700 [animation-delay:240ms]" />
                  </div>
                </div>
              )}
              {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            </div>

            <footer className="space-y-3 border-t border-slate-200 bg-white px-4 py-4">
              {stage === "upload" && (
                <>
                  {!reusePromptAnswered && !agentTyping && (
                    <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">{t.reuseQuestion}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" className="bank-btn" onClick={() => answerReusePrompt(true)}>
                          {t.reuseYes}
                        </button>
                        <button type="button" className="bank-btn-ghost" onClick={() => answerReusePrompt(false)}>
                          {t.reuseNo}
                        </button>
                      </div>
                    </div>
                  )}

                  {reusePromptAnswered && !confirmedOperationAmount && !agentTyping && !loadingLastOperationData && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-sm font-semibold text-slate-900">{t.amountPromptTitle}</p>
                      <p className="mt-1 text-xs text-slate-500">{t.amountPromptHint}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          className="bank-input max-w-xs"
                          value={operationAmountInput}
                          onChange={(e) => setOperationAmountInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              confirmOperationAmount();
                            }
                          }}
                          placeholder={t.amountPlaceholder}
                        />
                        <button type="button" className="bank-btn" onClick={confirmOperationAmount}>
                          {t.confirmAmount}
                        </button>
                      </div>
                    </div>
                  )}

                  {!!confirmedOperationAmount && (
                    <>
                      <label
                        className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm font-semibold transition ${
                          dragActive ? "border-cyan-500 bg-cyan-100 text-cyan-900" : "border-cyan-300 bg-cyan-50 text-slate-800"
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragActive(true);
                        }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragActive(false);
                          onPickFiles(e.dataTransfer.files);
                        }}
                      >
                        <UploadCloud size={18} className="text-cyan-700" />
                        {t.selectFiles}
                        <input
                          className="hidden"
                          type="file"
                          accept="application/pdf,image/*"
                          multiple
                          onChange={(e) => onPickFiles(e.target.files)}
                        />
                      </label>

                      {files.length > 0 && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                          <p className="inline-flex items-center gap-1 font-semibold">
                            <CheckCircle2 size={14} />
                            {files.length} {t.filesReady}
                          </p>
                          <p className="mt-1 text-xs">
                            {typeSummary.join(" · ")} | {totalSizeMb.toFixed(2)} MB
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        className="bank-btn w-fit"
                        onClick={submitDocuments}
                        disabled={uploading || files.length === 0 || extracting || !reusePromptAnswered || loadingLastOperationData}
                      >
                        {uploading ? t.uploadCreate : extracting ? t.extracting : t.sendDocs}
                      </button>
                    </>
                  )}
                </>
              )}

              {stage === "review" && (
                <button type="button" className="bank-btn w-fit" onClick={generateContract} disabled={generatingContract}>
                  {generatingContract ? t.generatingContract : t.generateContract}
                </button>
              )}

              {stage === "sign" && (
                <div className="grid gap-2 sm:max-w-sm">
                  <p className="text-sm text-slate-700">{t.signQuestion}</p>
                  <p className="text-xs text-slate-500">{t.signatureHelp}</p>
                  <div className="rounded-xl border border-slate-300 bg-white p-2">
                    <p className="mb-2 text-xs font-semibold text-slate-600">{t.drawSignature}</p>
                    <canvas
                      ref={signatureCanvasRef}
                      className="block h-[130px] w-full touch-none rounded-lg border border-slate-200 bg-white"
                      onPointerDown={startSignature}
                      onPointerMove={moveSignature}
                      onPointerUp={endSignature}
                      onPointerLeave={endSignature}
                    />
                    <button type="button" className="mt-2 bank-btn-ghost text-xs" onClick={clearSignature}>
                      {t.clearSignature}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="bank-btn w-fit" onClick={signContract} disabled={generatingContract}>
                      {t.signNow}
                    </button>
                    <button
                      type="button"
                      className="bank-btn-ghost"
                      onClick={() => {
                        setStage("review");
                        addUserMessage(t.notNow);
                        addAgentMessage(portalLang === "en" ? "Perfect, you can review the summary again and let me know when you want to sign." : "Perfecto, puedes revisar de nuevo el resumen y avisarme cuando quieras firmar.");
                      }}
                    >
                      {t.notNow}
                    </button>
                  </div>
                </div>
              )}

              {extracting && (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                  <p className="font-semibold">{t.processingAi}</p>
                  <p className="mt-1 text-xs">{t.processingAiHint}</p>
                </div>
              )}

              {stage === "done" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  {t.operationDone} {signedAt ? new Date(signedAt).toLocaleString(portalLang === "en" ? "en-US" : "es-CL") : "-"}.
                </div>
              )}

              {stage === "done" && speechSupported && !voiceOfferAnswered && (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                  <p className="font-semibold">
                    {portalLang === "en" ? "Do you want to continue by voice with the assistant?" : "¿Quieres continuar por voz con el asistente?"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button type="button" className="bank-btn" onClick={enableVoiceConversation}>
                      {portalLang === "en" ? "Yes, enable voice" : "Sí, activar voz"}
                    </button>
                    <button type="button" className="bank-btn-ghost" onClick={declineVoiceConversation}>
                      {portalLang === "en" ? "Not now" : "No por ahora"}
                    </button>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  {t.askAdvisor}
                </p>
                <div className="flex gap-2">
                  <input
                    className="bank-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendChatQuestion();
                      }
                    }}
                    placeholder={t.askPlaceholder}
                  />
                  {voiceConversationEnabled && (
                    <button
                      type="button"
                      className="bank-btn-ghost inline-flex items-center gap-2"
                      onClick={startVoiceChatCapture}
                      disabled={listeningVoiceChat}
                    >
                      <Mic size={14} />
                      {listeningVoiceChat ? (portalLang === "en" ? "Listening..." : "Escuchando...") : (portalLang === "en" ? "Speak" : "Hablar")}
                    </button>
                  )}
                  <button type="button" className="bank-btn px-4" onClick={sendChatQuestion}>
                    <Send size={14} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-cyan-300 hover:bg-cyan-50"
                      onClick={() => askSuggested(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </footer>
          </article>

          <aside className="h-[78vh] min-h-[620px] space-y-4 overflow-auto bg-white p-4">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {extractedSummary ? t.summaryExtracted : t.lastDataSummary}
              </p>
              {!extractedSummary && showLastOperationProfile ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-full text-left text-xs">
                    <tbody>
                      {LAST_OPERATION_PROFILE_ROWS.map((row) => (
                        <tr key={row.key} className="border-b border-slate-100 last:border-b-0">
                          <th className="w-1/2 bg-slate-50 px-2 py-2 font-semibold text-slate-600">
                            {portalLang === "en" ? row.labelEn : row.labelEs}
                          </th>
                          <td className="px-2 py-2 text-slate-800">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !extractedSummary ? (
                <p className="mt-3 text-sm text-slate-500">{t.summaryEmpty}</p>
              ) : (
                <div className="mt-2 space-y-1 text-sm text-slate-800">
                  <p><strong>Cliente:</strong> {extractedSummary.clientName}</p>
                  <p><strong>RUT/ID:</strong> {extractedSummary.clientRut}</p>
                  <p><strong>Tipo:</strong> {extractedSummary.operationType}</p>
                  <p><strong>Monto:</strong> {extractedSummary.currency} {extractedSummary.amount}</p>
                  <p><strong>Incoterm:</strong> {extractedSummary.incoterm}</p>
                  <p><strong>Beneficiario:</strong> {extractedSummary.beneficiaryName}</p>
                  {operationId && <p><strong>Operacion:</strong> {operationId}</p>}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t.loadedDocs}</p>
              {!files.length ? (
                <p className="mt-3 text-sm text-slate-500">{t.noDocs}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {files.map((file) => (
                    <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between rounded-xl border border-slate-200 p-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      {stage === "upload" && (
                        <button type="button" className="bank-btn-ghost text-xs" onClick={() => removeFile(file)}>
                          {t.remove}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <FileText size={14} />
                {t.contract}
              </p>
              {contractPdfUrl ? (
                <iframe
                  title="Previsualizacion contrato PDF"
                  src={contractPdfUrl}
                  className="mt-2 h-80 w-full rounded-xl border border-slate-200"
                />
              ) : (
                <p className="mt-2 text-sm text-slate-500">{t.contractPending}</p>
              )}
            </section>

            <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
              <p className="inline-flex items-center gap-2 font-semibold">
                <ShieldCheck size={15} />
                {t.flowState}
              </p>
              <p className="mt-1 text-xs">
                {stage === "upload" && t.flowUpload}
                {stage === "review" && t.flowReview}
                {stage === "sign" && t.flowSign}
                {stage === "done" && t.flowDone}
              </p>
            </section>
          </aside>
        </div>
      </section>
      <style jsx>{`
        @keyframes chatIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
