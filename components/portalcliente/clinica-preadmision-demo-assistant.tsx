"use client";

import Image from "next/image";
import { jsPDF } from "jspdf";
import {
  Activity,
  ArrowLeft,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartPulse,
  Home,
  Mic,
  MessageSquare,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Stethoscope,
  UploadCloud,
  UserCircle2,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type ChatMessage = {
  id: string;
  role: "agent" | "user";
  text: string;
  qrCodeUrl?: string;
  confirmationCode?: string;
};

type View = "portal" | "assistant" | "appointment-assistant";
type Stage = "identity" | "documents" | "review" | "sign" | "done";

type ExtractedSummary = {
  patientName: string;
  identityNumber: string;
  surgeryName: string;
  surgeryDate: string;
  clinicArea: string;
};

type PortalMetric = {
  label: string;
  value: string;
  trend: string;
};

const METRICS: PortalMetric[] = [
  { label: "Citas activas", value: "3", trend: "1 dentro de 14 dias" },
  { label: "Ordenes medicas", value: "6", trend: "2 nuevas esta semana" },
  { label: "Resultados", value: "12", trend: "Todo al dia" },
  { label: "Estado de cobertura", value: "Vigente", trend: "Sin alertas" }
];

const SUGGESTED_QUESTIONS = [
  "Que documentos necesito para preadmisión?",
  "Como llegar a la clinica MEDS?",
  "Cuales son los telefonos de contacto?",
  "Cual es la direccion de MEDS?"
];

const MEDS_CONTEXT = {
  site: "www.meds.cl",
  address: "Av. José Alcalde Délano 10.581, Lo Barnechea, Santiago",
  phoneMain: "+56 2 2499 6400",
  phoneAdmissions: "+56 2 2499 6500"
};

const SPAIN_CLINIC_CONTEXT = {
  clinic: "Clínica Salud Madrid Centro",
  address: "Calle de Serrano 142, 28006 Madrid, España",
  phoneMain: "+34 910 555 240",
  phoneAppointments: "+34 910 555 241",
  howTo: "🚇 Metro: Línea 4 (Serrano) + 5 min a pie. 🚗 Parking público en Calle del Príncipe de Vergara 118.",
  web: "www.saludmadridcentro.es"
};

type AppointmentFlowStage = "confirm" | "reason" | "reschedule" | "price-offer" | "doctor-change" | "other" | "done";

function appointmentGeneralReply(question: string) {
  const q = normalizeComparableText(question);
  if (q.includes("telefono") || q.includes("contact")) {
    return `📞 Teléfonos: central ${SPAIN_CLINIC_CONTEXT.phoneMain} · citas ${SPAIN_CLINIC_CONTEXT.phoneAppointments}.`;
  }
  if (q.includes("direccion") || q.includes("donde")) {
    return `📍 Dirección: ${SPAIN_CLINIC_CONTEXT.address}.`;
  }
  if (q.includes("llegar") || q.includes("como ir") || q.includes("como llegar")) {
    return `🧭 ${SPAIN_CLINIC_CONTEXT.howTo}`;
  }
  if (q.includes("web") || q.includes("sitio")) {
    return `🌐 Web de la clínica: ${SPAIN_CLINIC_CONTEXT.web}`;
  }
  return "🤝 Puedo ayudarte con teléfono, dirección, cómo llegar, cambio de horario o cambio de doctor.";
}

function formatSurgeryDate() {
  const target = new Date();
  target.setDate(target.getDate() + 14);
  return target.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function extractBaseName(fileName: string) {
  return fileName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function summarizeTypes(files: File[]) {
  const buckets = new Map<string, number>();
  for (const file of files) {
    const type = file.type.includes("pdf") ? "PDF" : file.type.startsWith("image/") ? "Imagen" : "Otro";
    buckets.set(type, (buckets.get(type) || 0) + 1);
  }
  return Array.from(buckets.entries()).map(([label, count]) => `${count} ${label}`);
}

function normalizeComparableText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function buildAdvisorReply(question: string, summary: ExtractedSummary | null) {
  const q = normalizeComparableText(question);
  const requestedNameMatch = q.match(/cirugia.*\sde\s+([a-z0-9\s]+)/i);
  if (requestedNameMatch) {
    const requestedName = normalizeComparableText(requestedNameMatch[1] ?? "");
    if (!summary) {
      return "🗂️ Aún no tengo pacientes cargados en esta sesión para consultar cirugías.";
    }
    const currentPatient = normalizeComparableText(summary.patientName);
    const matchesPatient = requestedName.length > 2 && currentPatient.includes(requestedName);
    if (matchesPatient) {
      return `✅ Sí, ${summary.patientName} tiene una cirugía programada para ${summary.surgeryDate} en ${summary.clinicArea}.`;
    }
    return `❌ No encontré cirugías registradas para \"${requestedNameMatch[1].trim()}\" en esta sesión.`;
  }
  if (q.includes("document")) {
    return "📄 Para preadmisión digital necesitas cédula de identidad y orden de hospitalización vigentes.";
  }
  if (q.includes("tarda") || q.includes("tiempo")) {
    return "⏱️ La validación suele demorar entre minutos y pocas horas según revisión administrativa.";
  }
  if (q.includes("despues") || q.includes("firm")) {
    return "✅ Luego de firmar, la clínica deja registrada la preadmisión y te enviará confirmación para ingreso en la fecha programada.";
  }
  if (q.includes("contact") || q.includes("telefono") || q.includes("telefon")) {
    return `📞 Contacto MEDS: Mesa central ${MEDS_CONTEXT.phoneMain} · Admisiones ${MEDS_CONTEXT.phoneAdmissions}.`;
  }
  if (q.includes("direccion") || q.includes("donde")) {
    return `📍 Dirección MEDS: ${MEDS_CONTEXT.address}.`;
  }
  if (q.includes("llegar") || q.includes("como ir") || q.includes("como llegar")) {
    return `🧭 Para llegar a MEDS (${MEDS_CONTEXT.address}), puedes usar Waze/Google Maps buscando \"MEDS Lo Barnechea\". Referencia: sector Av. La Dehesa.`;
  }
  if (q.includes("meds") || q.includes("sitio") || q.includes("web")) {
    return `🌐 Sitio web: ${MEDS_CONTEXT.site}.`;
  }
  return "🤝 Puedo ayudarte con requisitos de preadmisión, validación documental, firma digital, direcciones y teléfonos de contacto.";
}

function extractIdentityFromSpeech(transcript: string) {
  const directDigits = transcript.replace(/\D/g, "");
  if (directDigits) return directDigits;

  const tokenMap: Record<string, string> = {
    cero: "0",
    uno: "1",
    dos: "2",
    tres: "3",
    cuatro: "4",
    cinco: "5",
    seis: "6",
    siete: "7",
    ocho: "8",
    nueve: "9"
  };

  const normalized = normalizeComparableText(transcript);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const mappedDigits = tokens.map((token) => tokenMap[token] ?? "").join("");
  return mappedDigits || "";
}

function AppointmentConfirmationAssistant({ onBack }: { onBack: () => void }) {
  const appointmentDate = "jueves 27 de marzo de 2026";
  const appointmentTime = "18:30";
  const [flowStage, setFlowStage] = useState<AppointmentFlowStage>("confirm");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "agent",
      text: `👋 Hola Jose Maria, ¡qué gusto saludarte! Te recuerdo que tienes una cita pendiente en ${SPAIN_CLINIC_CONTEXT.clinic} el ${appointmentDate} a las ${appointmentTime}. ¿Te gustaría confirmarla?`
    }
  ]);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function addUser(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
  }

  function addAgent(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "agent", text }]);
  }

  function handleOption(option: string) {
    if (option === "confirm-yes") {
      addUser("✅ Sí, quiero confirmar la cita.");
      addAgent("💚 ¡Perfecto, Jose Maria! Tu cita quedó confirmada. ¿Tienes alguna duda adicional?");
      addAgent("😊 Gracias por confirmar. ¡Te esperamos!");
      setFlowStage("done");
      return;
    }
    if (option === "confirm-no") {
      addUser("❌ No, por ahora no puedo.");
      addAgent("🫶 No te preocupes, te ayudo encantado. ¿Cuál es el motivo principal?");
      setFlowStage("reason");
      return;
    }
    if (option === "reason-schedule") {
      addUser("🕒 No puedo en ese horario.");
      addAgent("📅 Entiendo. ¿Quieres agendar en otro horario? Tengo estas opciones:");
      setFlowStage("reschedule");
      return;
    }
    if (option === "reason-price") {
      addUser("💶 El precio me complica.");
      addAgent("🎁 Gracias por comentarlo. Podemos ofrecerte un 15% de descuento en esta cita para ayudarte a reagendar. ¿Te parece bien?");
      setFlowStage("price-offer");
      return;
    }
    if (option === "reason-doctor") {
      addUser("👨‍⚕️ Quiero cambiar de doctor.");
      addAgent("🩺 Claro, sin problema. Te propongo estas alternativas disponibles:");
      setFlowStage("doctor-change");
      return;
    }
    if (option === "reason-other") {
      addUser("📝 Es por otro motivo.");
      addAgent("🤍 Te entiendo. Podemos ayudarte con reprogramación flexible según tu situación. ¿Quieres que te reserve una nueva fecha?");
      setFlowStage("other");
      return;
    }
    if (option === "schedule-1") {
      addUser("🗓️ Prefiero martes 1 de abril a las 09:30.");
      addAgent("✅ Perfecto, quedaste agendado para el martes 1 de abril a las 09:30.");
      addAgent("🙂 ¿Tienes alguna duda adicional?");
      addAgent("¡Gracias! Te esperamos en la clínica.");
      setFlowStage("done");
      return;
    }
    if (option === "schedule-2") {
      addUser("🗓️ Prefiero miércoles 2 de abril a las 16:00.");
      addAgent("✅ Excelente, ya quedó reagendada para el miércoles 2 de abril a las 16:00.");
      addAgent("🙂 ¿Tienes alguna duda adicional?");
      addAgent("¡Gracias! Te esperamos en la clínica.");
      setFlowStage("done");
      return;
    }
    if (option === "schedule-3") {
      addUser("🗓️ Prefiero viernes 4 de abril a las 11:15.");
      addAgent("✅ Perfecto, reagendé tu cita para el viernes 4 de abril a las 11:15.");
      addAgent("🙂 ¿Tienes alguna duda adicional?");
      addAgent("¡Gracias! Te esperamos en la clínica.");
      setFlowStage("done");
      return;
    }
    if (option === "price-yes") {
      addUser("👍 Sí, con ese descuento me sirve.");
      addAgent("💙 ¡Qué buena noticia! Confirmo tu cita con 15% de descuento aplicado.");
      addAgent("🙂 ¿Tienes alguna duda adicional?");
      addAgent("¡Gracias! Nos vemos pronto.");
      setFlowStage("done");
      return;
    }
    if (option === "price-no") {
      addUser("No, prefiero otro horario.");
      addAgent("👌 Claro, te muestro horarios alternativos disponibles:");
      setFlowStage("reschedule");
      return;
    }
    if (option === "doctor-1") {
      addUser("Quiero con la Dra. Marta Ruiz.");
      addAgent("✅ Perfecto, te agendé con la Dra. Marta Ruiz para revisión de especialidad.");
      addAgent("🙂 ¿Tienes alguna duda adicional?");
      addAgent("¡Gracias por confirmar!");
      setFlowStage("done");
      return;
    }
    if (option === "doctor-2") {
      addUser("Prefiero al Dr. Álvaro Martín.");
      addAgent("✅ Perfecto, tu cita quedó con el Dr. Álvaro Martín.");
      addAgent("🙂 ¿Tienes alguna duda adicional?");
      addAgent("¡Gracias por confiar en nosotros!");
      setFlowStage("done");
      return;
    }
    if (option === "other-yes") {
      addUser("Sí, quiero una nueva fecha.");
      addAgent("📅 Genial, te muestro horarios disponibles para reagendar:");
      setFlowStage("reschedule");
      return;
    }
    if (option === "other-no") {
      addUser("No por ahora.");
      addAgent("🤍 Sin problema, Jose Maria. Cuando quieras retomamos la gestión de tu cita.");
      addAgent("😊 ¿Te puedo ayudar en algo más?");
      setFlowStage("done");
    }
  }

  function sendQuestion() {
    const value = chatInput.trim();
    if (!value) return;
    addUser(value);
    setChatInput("");
    const q = normalizeComparableText(value);
    const hasYes = /\b(si|sí|claro|vale|ok|confirmo|acepto|perfecto)\b/.test(q);
    const hasNo = /\b(no|nop|ahora no)\b/.test(q);
    const asksDoctor = /\b(doctor|doctora|medico|medica|especialista)\b/.test(q);
    const asksSchedule = /\b(hora|horario|agenda|turno|reagendar|reprogramar)\b/.test(q);
    const asksPrice = /\b(precio|caro|coste|costo|tarifa)\b/.test(q);

    // Intenciones globales: se aplican aunque el flujo vaya en otra etapa.
    if (asksDoctor && (flowStage !== "doctor-change" || hasNo)) {
      addAgent("🩺 Claro, sin problema. Te propongo estas alternativas disponibles:");
      setFlowStage("doctor-change");
      if (asksSchedule) addAgent("📅 También podemos cambiar la hora después de elegir doctor.");
      return;
    }
    if (asksSchedule && flowStage !== "reschedule") {
      addAgent("📅 Perfecto, revisemos un nuevo horario. Tengo estas opciones:");
      setFlowStage("reschedule");
      return;
    }
    if (asksPrice && flowStage !== "price-offer") {
      addAgent("🎁 Entiendo. Podemos ofrecerte un 15% de descuento para ayudarte a confirmar la cita. ¿Te parece bien?");
      setFlowStage("price-offer");
      return;
    }

    if (flowStage === "confirm") {
      if (hasYes) {
        addAgent("💚 ¡Perfecto, Jose Maria! Tu cita quedó confirmada. ¿Tienes alguna duda adicional?");
        addAgent("😊 Gracias por confirmar. ¡Te esperamos!");
        setFlowStage("done");
        return;
      }
      if (hasNo) {
        addAgent("🫶 No te preocupes, te ayudo encantado. ¿Cuál es el motivo principal?");
        setFlowStage("reason");
        return;
      }
    }

    if (flowStage === "reason") {
      addAgent("🤍 Te entiendo. Si quieres, puedo ayudarte ahora con cambio de horario, doctor o revisar opciones de precio.");
      return;
    }

    if (flowStage === "reschedule") {
      if (q.includes("martes") || q.includes("1") || q.includes("09 30") || q.includes("9 30")) {
        addAgent("✅ Perfecto, quedaste agendado para el martes 1 de abril a las 09:30.");
        addAgent("🙂 ¿Tienes alguna duda adicional?");
        addAgent("¡Gracias! Te esperamos en la clínica.");
        setFlowStage("done");
        return;
      }
      if (q.includes("miercoles") || q.includes("miércoles") || q.includes("2") || q.includes("16 00")) {
        addAgent("✅ Excelente, ya quedó reagendada para el miércoles 2 de abril a las 16:00.");
        addAgent("🙂 ¿Tienes alguna duda adicional?");
        addAgent("¡Gracias! Te esperamos en la clínica.");
        setFlowStage("done");
        return;
      }
      if (q.includes("viernes") || q.includes("4") || q.includes("11 15")) {
        addAgent("✅ Perfecto, reagendé tu cita para el viernes 4 de abril a las 11:15.");
        addAgent("🙂 ¿Tienes alguna duda adicional?");
        addAgent("¡Gracias! Te esperamos en la clínica.");
        setFlowStage("done");
        return;
      }
    }

    if (flowStage === "price-offer") {
      if (hasYes) {
        addAgent("💙 ¡Qué buena noticia! Confirmo tu cita con 15% de descuento aplicado.");
        addAgent("🙂 ¿Tienes alguna duda adicional?");
        addAgent("¡Gracias! Nos vemos pronto.");
        setFlowStage("done");
        return;
      }
      if (hasNo) {
        addAgent("👌 Claro, te muestro horarios alternativos disponibles:");
        setFlowStage("reschedule");
        return;
      }
    }

    if (flowStage === "doctor-change") {
      if (q.includes("marta") || q.includes("ruiz") || q.includes("1")) {
        addAgent("✅ Perfecto, te agendé con la Dra. Marta Ruiz para revisión de especialidad.");
        if (asksSchedule) {
          addAgent("📅 ¡Hecho! También te muestro horarios para cambiar la hora.");
          setFlowStage("reschedule");
        } else {
          addAgent("🙂 ¿Tienes alguna duda adicional?");
          addAgent("¡Gracias por confirmar!");
          setFlowStage("done");
        }
        return;
      }
      if (q.includes("alvaro") || q.includes("álvaro") || q.includes("martin") || q.includes("martín") || q.includes("2")) {
        addAgent("✅ Perfecto, tu cita quedó con el Dr. Álvaro Martín.");
        if (asksSchedule) {
          addAgent("📅 Genial, ahora revisemos el cambio de hora.");
          setFlowStage("reschedule");
        } else {
          addAgent("🙂 ¿Tienes alguna duda adicional?");
          addAgent("¡Gracias por confiar en nosotros!");
          setFlowStage("done");
        }
        return;
      }
    }

    if (flowStage === "other") {
      if (hasYes) {
        addAgent("📅 Genial, te muestro horarios disponibles para reagendar:");
        setFlowStage("reschedule");
        return;
      }
      if (hasNo) {
        addAgent("🤍 Sin problema, Jose Maria. Cuando quieras retomamos la gestión de tu cita.");
        addAgent("😊 ¿Te puedo ayudar en algo más?");
        setFlowStage("done");
        return;
      }
    }

    addAgent(`😊 ${appointmentGeneralReply(value)}`);
  }

  const optionButtons = (() => {
    if (flowStage === "confirm") {
      return [
        { id: "confirm-yes", label: "✅ Sí, confirmar cita" },
        { id: "confirm-no", label: "❌ No puedo asistir" }
      ];
    }
    if (flowStage === "reason") {
      return [
        { id: "reason-schedule", label: "🕒 No puedo en ese horario" },
        { id: "reason-price", label: "💶 Es por el precio" },
        { id: "reason-doctor", label: "👨‍⚕️ Quiero cambiar de doctor" },
        { id: "reason-other", label: "📝 Otro motivo" }
      ];
    }
    if (flowStage === "reschedule") {
      return [
        { id: "schedule-1", label: "📅 Mar 1 abril · 09:30" },
        { id: "schedule-2", label: "📅 Mié 2 abril · 16:00" },
        { id: "schedule-3", label: "📅 Vie 4 abril · 11:15" }
      ];
    }
    if (flowStage === "price-offer") {
      return [
        { id: "price-yes", label: "👍 Sí, acepto el descuento" },
        { id: "price-no", label: "🔁 Prefiero otro horario" }
      ];
    }
    if (flowStage === "doctor-change") {
      return [
        { id: "doctor-1", label: "👩‍⚕️ Dra. Marta Ruiz" },
        { id: "doctor-2", label: "👨‍⚕️ Dr. Álvaro Martín" }
      ];
    }
    if (flowStage === "other") {
      return [
        { id: "other-yes", label: "✅ Sí, reagendar" },
        { id: "other-no", label: "⏸️ No por ahora" }
      ];
    }
    return [];
  })();

  const quickQuestions = [
    "¿Cuál es el teléfono de la clínica?",
    "¿Cómo llegar a la clínica?",
    "¿Cuál es la dirección exacta?",
    "¿Tienen web de contacto?"
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <section className="bank-card overflow-hidden p-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <Image src="/megafy-logo.png" alt="Megafile" width={150} height={44} priority />
            <div>
              <p className="text-lg font-semibold text-slate-900">Clínica - Confirmación de citas</p>
              <p className="text-sm text-slate-600">Asistente cercano para gestionar tu próxima cita</p>
            </div>
          </div>
          <button type="button" className="bank-btn-ghost inline-flex items-center gap-2" onClick={onBack}>
            <ArrowLeft size={14} />
            Volver al portal
          </button>
        </header>

        <div className="grid gap-0 lg:grid-cols-[1.45fr_1fr]">
          <article className="flex h-[78vh] min-h-[620px] flex-col border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <MessageSquare size={16} className="text-teal-700" />
              <p className="text-sm font-semibold text-slate-900">Chatbot de confirmación de citas</p>
            </div>

            <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-auto p-4 scroll-smooth">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${
                    message.role === "agent"
                      ? "border border-teal-200 bg-teal-50 text-slate-800"
                      : "ml-auto border border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {message.role === "agent" ? "Asistente IA" : "Paciente"}
                  </p>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            <footer className="space-y-3 border-t border-slate-200 bg-white px-4 py-4">
              {optionButtons.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {optionButtons.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-teal-300 hover:bg-teal-50"
                      onClick={() => handleOption(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-200 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Consultas rápidas</p>
                <div className="flex gap-2">
                  <input
                    className="bank-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendQuestion();
                      }
                    }}
                    placeholder="Escribe tu pregunta"
                  />
                  <button type="button" className="bank-btn px-4" onClick={sendQuestion}>
                    <Send size={14} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-teal-300 hover:bg-teal-50"
                      onClick={() => {
                        addUser(question);
                        addAgent(appointmentGeneralReply(question));
                      }}
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
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Resumen de cita</p>
              <div className="mt-2 space-y-1 text-sm text-slate-800">
                <p><strong>Paciente:</strong> Jose Maria</p>
                <p><strong>Clínica:</strong> {SPAIN_CLINIC_CONTEXT.clinic}</p>
                <p><strong>Fecha:</strong> {appointmentDate}</p>
                <p><strong>Hora:</strong> {appointmentTime}</p>
                <p><strong>Estado:</strong> {flowStage === "done" ? "Gestión completada" : "Pendiente de confirmación"}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
              <p className="font-semibold">Contacto rápido</p>
              <p className="mt-1">📍 {SPAIN_CLINIC_CONTEXT.address}</p>
              <p className="mt-1">📞 {SPAIN_CLINIC_CONTEXT.phoneMain}</p>
              <p className="mt-1">📅 Citas: {SPAIN_CLINIC_CONTEXT.phoneAppointments}</p>
              <p className="mt-1">🌐 {SPAIN_CLINIC_CONTEXT.web}</p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

export function ClinicaPreadmisionDemoAssistant({ username = "Paciente" }: { username?: string }) {
  const [view, setView] = useState<View>("portal");
  const [stage, setStage] = useState<Stage>("identity");
  const [identityInput, setIdentityInput] = useState("");
  const [identityNumber, setIdentityNumber] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentTyping, setAgentTyping] = useState(false);
  const [summary, setSummary] = useState<ExtractedSummary | null>(null);
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(null);
  const [consentPdfUrl, setConsentPdfUrl] = useState<string | null>(null);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [hasSignatureStroke, setHasSignatureStroke] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listeningIdentity, setListeningIdentity] = useState(false);
  const [voiceOfferAnswered, setVoiceOfferAnswered] = useState(false);
  const [voiceConversationEnabled, setVoiceConversationEnabled] = useState(false);
  const [listeningVoiceChat, setListeningVoiceChat] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const identityRecognitionRef = useRef<any>(null);
  const chatRecognitionRef = useRef<any>(null);
  const voiceContinuousRef = useRef(false);
  const agentSpeakingRef = useRef(false);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioUrlRef = useRef<string | null>(null);
  const drawingRef = useRef(false);
  const introTimersRef = useRef<number[]>([]);

  const surgeryDate = useMemo(() => formatSurgeryDate(), []);
  const totalSizeMb = useMemo(() => files.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024), [files]);
  const typeSummary = useMemo(() => summarizeTypes(files), [files]);

  const contractText = summary
    ? `CONTRATO DE PREADMISION DIGITAL (DEMO)\n\nFecha de emision: ${new Date().toLocaleString("es-ES")}\nOperacion Megafile: ${operationId ?? "Pendiente"}\nEmpresa asignada: Clinica\nPaciente: ${summary.patientName}\nDocumento de identidad: ${summary.identityNumber}\nProcedimiento programado: ${summary.surgeryName}\nFecha de cirugia: ${summary.surgeryDate}\nArea: ${summary.clinicArea}\n\nEl paciente confirma que los datos y documentos presentados corresponden a su identidad y autoriza el proceso de preadmisión digital para su atencion medica.`
    : "";

  useEffect(() => {
    if (view !== "assistant") return;
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, view]);

  useEffect(() => {
    return () => {
      for (const timerId of introTimersRef.current) {
        window.clearTimeout(timerId);
      }
      if (contractPdfUrl) URL.revokeObjectURL(contractPdfUrl);
      if (consentPdfUrl) URL.revokeObjectURL(consentPdfUrl);
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      if (ttsAudioUrlRef.current) {
        URL.revokeObjectURL(ttsAudioUrlRef.current);
        ttsAudioUrlRef.current = null;
      }
    };
  }, [consentPdfUrl, contractPdfUrl]);

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
        voices.find((voice) => voice.lang.toLowerCase().startsWith("es") && /neural|natural|premium|google|microsoft/i.test(voice.name)) ??
        voices.find((voice) => voice.lang.toLowerCase().startsWith("es")) ??
        null;
      selectedVoiceRef.current = preferred;
    }
    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.lang = selectedVoiceRef.current?.lang || "es-CL";
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
  }, [voiceConversationEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      return;
    }
    setSpeechSupported(true);
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-CL";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const pushAgentMessage = (text: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          text
        }
      ]);
    };

    recognition.onresult = (event: any) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript ?? "").trim();
      const extracted = extractIdentityFromSpeech(transcript);
      if (extracted) {
        setIdentityInput(extracted);
        pushAgentMessage(`🎤 Documento detectado por voz: ${extracted}`);
      } else {
        pushAgentMessage("🎤 Escuché el audio, pero no pude detectar números. Intenta decirlo nuevamente.");
      }
    };
    recognition.onerror = () => {
      setListeningIdentity(false);
      pushAgentMessage("⚠️ No pude capturar audio. Revisa permisos de micrófono e inténtalo de nuevo.");
    };
    recognition.onend = () => setListeningIdentity(false);

    identityRecognitionRef.current = recognition;
    const chatRecognition = new SpeechRecognitionCtor();
    chatRecognition.lang = "es-CL";
    chatRecognition.interimResults = false;
    chatRecognition.maxAlternatives = 1;
    chatRecognition.onresult = (event: any) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript ?? "").trim();
      if (!transcript) {
        setListeningVoiceChat(false);
        return;
      }
      const normalizedTranscript = normalizeComparableText(transcript);
      const wantsToStop =
        /\b(gracias|no gracias|eso es todo|nada mas|nada más|adios|hasta luego|no necesito mas|no necesito más|ninguna otra pregunta)\b/.test(normalizedTranscript);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: `🎙️ ${transcript}` }]);
      if (wantsToStop) {
        voiceContinuousRef.current = false;
        setVoiceConversationEnabled(false);
        setVoiceOfferAnswered(true);
        setListeningVoiceChat(false);
        const bye = "Perfecto. Cerramos la conversación por voz. Si necesitas algo más, aquí estaré.";
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "agent", text: `✅ ${bye}` }]);
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(bye);
          utterance.lang = selectedVoiceRef.current?.lang || "es-CL";
          if (selectedVoiceRef.current) utterance.voice = selectedVoiceRef.current;
          utterance.rate = 0.97;
          utterance.pitch = 1;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }
        return;
      }

      const answer = buildAdvisorReply(transcript, summary);
      const followup = `${answer} ¿Te puedo ayudar en algo más?`;
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "agent", text: `🤖 ${followup}` }]);
      speakAgentResponse(followup);
    };
    chatRecognition.onerror = () => {
      setListeningVoiceChat(false);
      pushAgentMessage("⚠️ No pude capturar tu pregunta por voz. Inténtalo de nuevo.");
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
        recognition.stop();
        chatRecognition.stop();
        if (ttsAudioRef.current) {
          ttsAudioRef.current.pause();
          ttsAudioRef.current = null;
        }
        if (ttsAudioUrlRef.current) {
          URL.revokeObjectURL(ttsAudioUrlRef.current);
          ttsAudioUrlRef.current = null;
        }
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      } catch {
        // noop
      }
      identityRecognitionRef.current = null;
      chatRecognitionRef.current = null;
    };
  }, [speakAgentResponse, summary, voiceConversationEnabled]);

  function addUserMessage(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
  }

  function addAgentMessage(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "agent", text }]);
  }

  function addAgentMessageWithIcon(icon: string, text: string) {
    addAgentMessage(`${icon} ${text}`);
  }

  function addAgentQrMessage(text: string, code: string, url: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "agent",
        text,
        confirmationCode: code,
        qrCodeUrl: url
      }
    ]);
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
    setAgentTyping(true);

    const intro = [
      `👋 Hola ${username}, soy tu asistente de preadmisión digital de la clínica.`,
      "🪪 Para comenzar, ingresa tu documento de identidad en el campo inferior y presiona Confirmar identidad.",
      "📄 Luego consultaré agenda médica y te pediré cédula y orden de hospitalización para validar la preadmisión."
    ];

    let elapsed = 260;
    intro.forEach((text, index) => {
      elapsed += 760;
      const timer = window.setTimeout(() => {
        addAgentMessage(text);
        if (index === intro.length - 1) setAgentTyping(false);
      }, elapsed);
      introTimersRef.current.push(timer);
    });
  }

  function openAssistant() {
    resetAssistantState();
    setView("assistant");
    playIntroConversation();
  }

  function openAppointmentAssistant() {
    setView("appointment-assistant");
  }

  function resetAssistantState() {
    setStage("identity");
    setIdentityInput("");
    setIdentityNumber(null);
    setFiles([]);
    setOperationId(null);
    setUploading(false);
    setExtracting(false);
    setDragActive(false);
    setError(null);
    setChatInput("");
    setMessages([]);
    setAgentTyping(false);
    setSummary(null);
    if (contractPdfUrl) URL.revokeObjectURL(contractPdfUrl);
    if (consentPdfUrl) URL.revokeObjectURL(consentPdfUrl);
    setContractPdfUrl(null);
    setConsentPdfUrl(null);
    setGeneratingContract(false);
    setSignedAt(null);
    setHasSignatureStroke(false);
    setConfirmationCode(null);
    setQrCodeUrl(null);
    setVoiceOfferAnswered(false);
    setVoiceConversationEnabled(false);
    setListeningVoiceChat(false);
    setListeningIdentity(false);
    try {
      identityRecognitionRef.current?.stop();
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
    clearIntroTimers();
  }

  function startIdentityVoiceCapture() {
    if (!speechSupported || !identityRecognitionRef.current || listeningIdentity) return;
    setError(null);
    setListeningIdentity(true);
    try {
      identityRecognitionRef.current.start();
    } catch {
      setListeningIdentity(false);
      setError("No fue posible iniciar la captura de voz. Intenta nuevamente.");
    }
  }

  function enableVoiceConversation() {
    setVoiceOfferAnswered(true);
    setVoiceConversationEnabled(true);
    voiceContinuousRef.current = true;
    addUserMessage("Sí, quiero conversar con voz.");
    addAgentMessageWithIcon("🎙️", "Perfecto. Haz tu pregunta por voz y te responderé también con voz.");
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
    addUserMessage("No, gracias.");
  }

  function startVoiceChatCapture() {
    if (!speechSupported || !chatRecognitionRef.current || listeningVoiceChat || !voiceConversationEnabled) return;
    setError(null);
    setListeningVoiceChat(true);
    try {
      chatRecognitionRef.current.start();
    } catch {
      setListeningVoiceChat(false);
      setError("No fue posible iniciar la conversación por voz. Intenta nuevamente.");
    }
  }

  function confirmIdentity() {
    const value = identityInput.trim();
    if (value.length < 5) {
      setError("Ingresa un numero de documento valido para continuar.");
      return;
    }

    setError(null);
    setIdentityNumber(value);
    addUserMessage(`Documento de identidad: ${value}`);
    setAgentTyping(true);

    window.setTimeout(() => {
      addAgentMessageWithIcon("📅", "Estoy consultando la agenda medica...");
    }, 380);

    window.setTimeout(() => {
      addAgentMessageWithIcon("✅", `Encontré una cirugía pendiente programada para ${surgeryDate}.`);
      addAgentMessageWithIcon("📎", "Ahora necesito dos documentos: cédula de identidad y orden de hospitalización.");
      addAgentMessageWithIcon("🔎", "Cuando los cargues, validaré que la información coincida con el número de cédula.");
      setStage("documents");
      setAgentTyping(false);
    }, 1150);
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

  function hasRequiredDocuments(items: File[]) {
    if (items.length >= 2) {
      // Demo-friendly fallback: if at least two files are present, treat them as required docs.
      return { hasCedula: true, hasOrder: true };
    }
    const names = items.map((f) => extractBaseName(f.name));
    const hasCedula = names.some((name) => name.includes("cedula") || name.includes("identidad"));
    const hasOrder = names.some((name) => name.includes("orden") && name.includes("hospital"));
    return { hasCedula, hasOrder };
  }

  function idMatchesInFiles(items: File[], identity: string) {
    if (items.length >= 2) {
      // Demo simulation: assume OCR/validation succeeds when required docs are uploaded.
      return true;
    }
    const digits = identity.replace(/\D/g, "");
    if (!digits) return true;
    return items.every((file) => extractBaseName(file.name).replace(/\D/g, "").includes(digits));
  }

  async function validateDocumentsAndCreateOperation() {
    setError(null);
    addUserMessage("Validar documentos de preadmisión.");
    if (!identityNumber) {
      setError("Primero confirma tu documento de identidad.");
      return;
    }
    if (files.length < 2) {
      setError("Debes cargar al menos 2 archivos: cédula de identidad y orden de hospitalización.");
      return;
    }

    const required = hasRequiredDocuments(files);
    if (!required.hasCedula || !required.hasOrder) {
      setError("No encontré ambos documentos obligatorios. Usa nombres que incluyan cédula/identidad y orden hospitalización.");
      return;
    }

    if (!idMatchesInFiles(files, identityNumber)) {
      setError("La validación falló: la información simulada no coincide con el número de cédula indicado.");
      addAgentMessageWithIcon("⚠️", "Detecté inconsistencia entre documentos y número de cédula. Revisa los archivos e inténtalo nuevamente.");
      return;
    }

    setUploading(true);
    addUserMessage(`Subí ${files.length} documentos para preadmisión.`);

    try {
      const fallbackPatientName = `Paciente ${identityNumber.replace(/\D/g, "") || "SinNombre"}`;
      const payload = new FormData();
      payload.set("clientName", fallbackPatientName);
      payload.set("clientRut", identityNumber);
      payload.set("companyName", "Clínica");
      files.forEach((file) => payload.append("documents", file));

      const response = await fetch("/api/portalcliente/operations", {
        method: "POST",
        body: payload
      });
      const data = (await response.json().catch(() => null)) as { error?: string; operationId?: string } | null;

      if (!response.ok || !data?.operationId) {
        setError(data?.error || "No fue posible crear la operación de preadmisión en Megafile.");
        setUploading(false);
        return;
      }

      setOperationId(data.operationId);
      setUploading(false);
      setExtracting(true);

      const processResponse = await fetch("/api/portalcliente/operations/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationId: data.operationId })
      });
      if (!processResponse.ok) {
        throw new Error("No fue posible completar el procesamiento IA de la operación.");
      }
      addAgentMessageWithIcon("🧠", "La IA catalogó los documentos y completó la extracción de campos en Megafile.");

      const forceExtractionResponse = await fetch(`/api/portalcliente/operations/${data.operationId}/force-order-extraction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRut: identityNumber
        })
      });
      if (!forceExtractionResponse.ok) {
        throw new Error("No fue posible forzar extracción de nombre y RUT en la orden de hospitalización.");
      }
      const forceData = (await forceExtractionResponse.json().catch(() => null)) as
        | { appliedPatientName?: string | null; appliedPatientRut?: string | null }
        | null;
      const extractedPatientName = forceData?.appliedPatientName?.trim() || fallbackPatientName;
      const extractedPatientRut = forceData?.appliedPatientRut?.trim() || identityNumber;

      setSummary({
        patientName: extractedPatientName,
        identityNumber: extractedPatientRut,
        surgeryName: "Cirugía laparoscópica programada",
        surgeryDate,
        clinicArea: "Cirugía General"
      });

      setStage("review");
      setExtracting(false);
      addAgentMessageWithIcon("✅", "Validación completada: la cédula coincide con la orden de hospitalización.");
      addAgentMessageWithIcon("🧾", "Generaré el contrato de preadmisión para firma de rúbrica.");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Error inesperado";
      setError(message);
      setUploading(false);
      setExtracting(false);
    }
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

  async function buildContractPdf(signatureDataUrl?: string | null) {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const logoData = await logoAsDataUrl("/megafy-logo.png");
    pdf.addImage(logoData, "PNG", 40, 22, 150, 56);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Contrato de preadmisión digital (Demo)", 40, 102);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    const lines = pdf.splitTextToSize(contractText, 515);
    pdf.text(lines, 40, 128);

    if (signatureDataUrl) {
      pdf.setDrawColor(190, 198, 211);
      pdf.line(40, 728, 260, 728);
      pdf.setFontSize(9.5);
      pdf.text("Firma paciente", 40, 742);
      pdf.addImage(signatureDataUrl, "PNG", 40, 664, 210, 58);
    }

    return pdf.output("blob");
  }

  async function buildConsentPdf(signatureDataUrl?: string | null) {
    if (!summary) throw new Error("No hay datos para generar consentimiento.");

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const logoData = await logoAsDataUrl("/megafy-logo.png");
    pdf.addImage(logoData, "PNG", 40, 22, 150, 56);

    const consentText = `CONSENTIMIENTO INFORMADO (EJEMPLO)

Fecha de emision: ${new Date().toLocaleString("es-ES")}
Operacion Megafile: ${operationId ?? "Pendiente"}
Paciente: ${summary.patientName}
Documento de identidad: ${summary.identityNumber}
Procedimiento: ${summary.surgeryName}
Fecha programada: ${summary.surgeryDate}
Area clinica: ${summary.clinicArea}

Declaro haber sido informado sobre el procedimiento programado, sus objetivos, cuidados previos y posteriores, asi como la documentacion requerida para el ingreso clinico. Confirmo que he podido realizar preguntas y comprendo la informacion entregada para este proceso de preadmisión.

Autorizo la gestion administrativa y documental asociada a mi ingreso clinico.`;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Consentimiento informado (Ejemplo)", 40, 102);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    const lines = pdf.splitTextToSize(consentText, 515);
    pdf.text(lines, 40, 128);

    if (signatureDataUrl) {
      pdf.setDrawColor(190, 198, 211);
      pdf.line(40, 728, 260, 728);
      pdf.setFontSize(9.5);
      pdf.text("Firma paciente", 40, 742);
      pdf.addImage(signatureDataUrl, "PNG", 40, 664, 210, 58);
    }

    return pdf.output("blob");
  }

  async function generateContract() {
    if (!summary) {
      setError("No hay datos de preadmisión para generar el contrato.");
      return;
    }

    setGeneratingContract(true);
    setError(null);

    try {
      const blob = await buildContractPdf();
      const url = URL.createObjectURL(blob);
      if (contractPdfUrl) URL.revokeObjectURL(contractPdfUrl);
      setContractPdfUrl(url);
      const consentBlob = await buildConsentPdf();
      const consentUrl = URL.createObjectURL(consentBlob);
      if (consentPdfUrl) URL.revokeObjectURL(consentPdfUrl);
      setConsentPdfUrl(consentUrl);
      setStage("sign");
      addUserMessage("Generar contrato de preadmisión.");
      addAgentMessageWithIcon("📄", "Contrato y consentimiento informado generados correctamente. Puedes revisarlos y firmar con rúbrica.");
    } catch (pdfError) {
      const message = pdfError instanceof Error ? pdfError.message : "No fue posible generar el PDF";
      setError(message);
    } finally {
      setGeneratingContract(false);
    }
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

  async function signContract() {
    if (!hasSignatureStroke || !signatureCanvasRef.current) {
      setError("Debes dibujar tu rúbrica antes de firmar.");
      return;
    }

    setError(null);
    const signatureDataUrl = signatureCanvasRef.current.toDataURL("image/png");
    setGeneratingContract(true);
    try {
      const blob = await buildContractPdf(signatureDataUrl);
      const consentBlob = await buildConsentPdf(signatureDataUrl);
      const url = URL.createObjectURL(blob);
      const consentUrl = URL.createObjectURL(consentBlob);
      if (contractPdfUrl) URL.revokeObjectURL(contractPdfUrl);
      if (consentPdfUrl) URL.revokeObjectURL(consentPdfUrl);
      setContractPdfUrl(url);
      setConsentPdfUrl(consentUrl);
      const timestamp = new Date().toISOString();
      setSignedAt(timestamp);

      if (operationId) {
        const contractUpload = new FormData();
        contractUpload.set("file", new File([blob], "contrato-preadmision-firmado.pdf", { type: "application/pdf" }));
        contractUpload.set("signedAt", timestamp);
        const contractUploadResponse = await fetch(`/api/portalcliente/operations/${operationId}/signed-contract`, {
          method: "POST",
          body: contractUpload
        });
        if (!contractUploadResponse.ok) throw new Error("No fue posible guardar el contrato firmado en la operación.");

        const consentUpload = new FormData();
        consentUpload.set("file", new File([consentBlob], "consentimiento-informado-firmado.pdf", { type: "application/pdf" }));
        consentUpload.set("signedAt", timestamp);
        const consentUploadResponse = await fetch(`/api/portalcliente/operations/${operationId}/signed-contract`, {
          method: "POST",
          body: consentUpload
        });
        if (!consentUploadResponse.ok) throw new Error("No fue posible guardar el consentimiento informado en la operación.");
      }

      addUserMessage("Firmar contrato con rúbrica.");
      addAgentMessageWithIcon("✅", "Firma validada. Contrato y consentimiento informado fueron firmados correctamente.");
      generateEntryConfirmation();
    } catch {
      setError("No fue posible incrustar o guardar la firma en el PDF.");
    } finally {
      setGeneratingContract(false);
    }
  }

  function generateEntryConfirmation() {
    if (!summary) {
      setError("No hay datos de preadmisión para generar el código de confirmación.");
      return;
    }
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const code = `MEDS-${datePart}-${suffix}`;
    const qrPayload = JSON.stringify({
      type: "preadmision_confirmacion",
      operationId,
      patient: summary.patientName,
      identity: summary.identityNumber,
      code
    });
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrPayload)}`;

    setConfirmationCode(code);
    setQrCodeUrl(url);
    setStage("done");
    addUserMessage("Generar código de confirmación y QR.");
    addAgentMessageWithIcon("🎫", `Código de confirmación generado: ${code}.`);
    addAgentQrMessage("📲 Presenta este QR en admisión para agilizar tu entrada.", code, url);
    addAgentMessage("¿Te puedo ayudar en algo más? 😊");
    addAgentMessageWithIcon("🎙️", "¿Quieres conversar con voz?");
  }

  function advisorReply(question: string) {
    return buildAdvisorReply(question, summary);
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

  if (view === "portal") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1480px] px-4 py-6 md:px-8 md:py-8">
        <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur">
          <div className="grid min-h-[82vh] lg:grid-cols-[250px_1fr]">
            <aside className="flex h-full flex-col border-r border-slate-200/90 bg-[#f5fbfb]">
              <div className="border-b border-slate-200/90 px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#0f766e] p-2">
                    <HeartPulse size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Clínica Central</p>
                    <p className="text-xs text-slate-500">Portal Pacientes</p>
                  </div>
                </div>
              </div>

              <nav className="space-y-2 px-3 py-5">
                <button type="button" className="flex w-full items-center gap-2 rounded-xl bg-[#e9fbf8] px-3 py-2.5 text-left text-sm font-semibold text-[#0f766e]">
                  <Home size={16} />
                  Inicio
                </button>
                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100">
                  <CalendarDays size={16} />
                  Citas
                </button>
                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100">
                  <ClipboardList size={16} />
                  Historial
                </button>
                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100">
                  <Activity size={16} />
                  Resultados
                </button>
                <button
                  type="button"
                  onClick={openAssistant}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-[#2dd4bf] bg-gradient-to-r from-[#eafffb] to-[#e8f6ff] px-3 py-2.5 text-left text-sm font-semibold text-[#115e59] shadow-sm hover:brightness-105"
                >
                  <Stethoscope size={16} />
                  Preadmisión digital
                </button>
                <button
                  type="button"
                  onClick={openAppointmentAssistant}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl border border-[#99f6e4] bg-gradient-to-r from-[#f0fdfa] to-[#f8fafc] px-3 py-2.5 text-left text-sm font-semibold text-[#0f766e] shadow-sm hover:brightness-105"
                >
                  <CalendarDays size={16} />
                  Confirmación de cita
                </button>
              </nav>

              <div className="mt-auto space-y-1 border-t border-slate-200/90 px-3 py-4">
                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                  <Users size={16} />
                  Soporte paciente
                </button>
                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                  <Settings size={16} />
                  Configuración
                </button>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <UserCircle2 size={18} className="text-slate-500" />
                  <span className="text-sm font-medium text-slate-800">{username}</span>
                </div>
              </div>
            </aside>

            <div className="space-y-5 bg-[#fcfffe] px-5 py-5 md:px-7">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-3xl font-semibold text-slate-900">Bienvenido, {username}</p>
                  <p className="text-sm text-slate-500">Portal de servicios clínicos y preadmisión</p>
                </div>
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                  <input
                    className="w-64 rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                    placeholder="Buscar en el portal..."
                  />
                </div>
              </header>

              <section className="relative overflow-hidden rounded-[28px] border border-[#d8f7ef] bg-gradient-to-r from-[#dff7f1] via-[#e9f6ff] to-[#f4fff7] p-8">
                <div className="relative z-10 max-w-xl">
                  <p className="text-5xl font-semibold leading-tight text-[#0b403a]">Gestiona tu preadmisión médica en minutos</p>
                  <p className="mt-3 text-base text-slate-700">
                    Completa tus requisitos antes del ingreso hospitalario con validación documental y firma digital de contrato.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-4">
                    <button type="button" onClick={openAssistant} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow">
                      Iniciar preadmisión digital
                    </button>
                    <button
                      type="button"
                      onClick={openAppointmentAssistant}
                      className="rounded-xl border border-teal-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-[#0f766e] shadow"
                    >
                      Confirmar o reagendar cita
                    </button>
                  </div>
                </div>
                <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-gradient-to-br from-teal-200/70 to-cyan-300/70 blur-2xl" />
                <div className="pointer-events-none absolute bottom-0 right-16 h-44 w-44 rounded-full border border-white/70 bg-white/35 backdrop-blur" />
              </section>

              <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Proximos eventos clínicos</h3>
                    <span className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500">14 dias</span>
                  </div>
                  <div className="overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.08em] text-slate-500">
                          <th className="px-2 py-2 font-semibold">Fecha</th>
                          <th className="px-2 py-2 font-semibold">Evento</th>
                          <th className="px-2 py-2 font-semibold">Área</th>
                          <th className="px-2 py-2 font-semibold">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="px-2 py-2 text-slate-600">{surgeryDate}</td>
                          <td className="px-2 py-2 font-medium text-slate-900">Cirugía laparoscópica programada</td>
                          <td className="px-2 py-2 text-slate-600">Cirugía General</td>
                          <td className="px-2 py-2">
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Preadmisión pendiente</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <aside className="space-y-3">
                  {METRICS.map((kpi) => (
                    <article key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{kpi.label}</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">{kpi.value}</p>
                      <p className="mt-1 text-xs text-teal-700">{kpi.trend}</p>
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

  if (view === "appointment-assistant") {
    return <AppointmentConfirmationAssistant onBack={() => setView("portal")} />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <section className="bank-card overflow-hidden p-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <Image src="/megafy-logo.png" alt="Megafile" width={150} height={44} priority />
            <div>
              <p className="text-lg font-semibold text-slate-900">Clínica - Preadmisión</p>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Asistente inteligente</p>
              <p className="text-sm text-slate-600">Operación Megafile catalogada en empresa Clínica</p>
            </div>
          </div>
          <button type="button" className="bank-btn-ghost inline-flex items-center gap-2" onClick={() => setView("portal")}>
            <ArrowLeft size={14} />
            Volver al portal
          </button>
        </header>

        <div className="grid gap-0 lg:grid-cols-[1.45fr_1fr]">
          <article className="flex h-[78vh] min-h-[620px] flex-col border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <MessageSquare size={16} className="text-teal-700" />
              <p className="text-sm font-semibold text-slate-900">Chatbot de preadmisión médica</p>
            </div>

            <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-auto p-4 scroll-smooth">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${
                    message.role === "agent"
                      ? "border border-teal-200 bg-teal-50 text-slate-800"
                      : "ml-auto border border-slate-200 bg-white text-slate-900"
                  }`}
                  style={{ animation: "chatIn 300ms ease-out" }}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {message.role === "agent" ? (
                      <span className="inline-flex items-center gap-1">
                        <Bot size={11} />
                        Asistente IA
                      </span>
                    ) : (
                      "Paciente"
                    )}
                  </p>
                  <p>{message.text}</p>
                  {message.qrCodeUrl && message.confirmationCode ? (
                    <div className="mt-2">
                      <p className="mb-2">🔐 Tu código de confirmación: <strong>{message.confirmationCode}</strong></p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={message.qrCodeUrl} alt="QR de confirmación de preadmisión" className="h-40 w-40 rounded-lg border border-slate-200 bg-white" />
                    </div>
                  ) : null}
                </div>
              ))}
              {agentTyping && (
                <div className="max-w-[92%] rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-slate-800">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Bot size={11} />
                      Asistente IA
                    </span>
                  </p>
                  <div className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-700 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-700 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-700 [animation-delay:240ms]" />
                  </div>
                </div>
              )}
              {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            </div>

            <footer className="space-y-3 border-t border-slate-200 bg-white px-4 py-4">
              {stage === "identity" && !agentTyping && messages.length >= 3 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">Paso 1: Introduce tu documento de identidad</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      className="bank-input max-w-xs"
                      value={identityInput}
                      onChange={(e) => setIdentityInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          confirmIdentity();
                        }
                      }}
                      placeholder="Ejemplo: 12345678"
                    />
                    <button
                      type="button"
                      className="bank-btn-ghost inline-flex items-center gap-2"
                      onClick={startIdentityVoiceCapture}
                      disabled={!speechSupported || listeningIdentity}
                    >
                      <Mic size={15} />
                      {listeningIdentity ? "Escuchando..." : "Dictar cédula"}
                    </button>
                    <button type="button" className="bank-btn" onClick={confirmIdentity}>
                      Confirmar identidad
                    </button>
                  </div>
                  {!speechSupported && (
                    <p className="mt-2 text-xs text-slate-500">
                      Este navegador no soporta captura de voz para documento de identidad.
                    </p>
                  )}
                </div>
              )}

              {stage === "documents" && (
                <>
                  <label
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm font-semibold transition ${
                      dragActive ? "border-teal-500 bg-teal-100 text-teal-900" : "border-teal-300 bg-teal-50 text-slate-800"
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
                    <UploadCloud size={18} className="text-teal-700" />
                    Cargar cédula y orden de hospitalización
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
                        {files.length} archivo(s) listos
                      </p>
                      <p className="mt-1 text-xs">
                        {typeSummary.join(" · ")} | {totalSizeMb.toFixed(2)} MB
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    className="bank-btn w-fit"
                    onClick={validateDocumentsAndCreateOperation}
                    disabled={uploading || files.length === 0 || extracting}
                  >
                    {uploading ? "Creando operación..." : extracting ? "Validando información..." : "Validar documentos"}
                  </button>
                </>
              )}

              {stage === "review" && (
                <button type="button" className="bank-btn w-fit" onClick={generateContract} disabled={generatingContract}>
                  {generatingContract ? "Generando contrato PDF..." : "Generar contrato de preadmisión"}
                </button>
              )}

              {stage === "sign" && (
                <div className="grid gap-2 sm:max-w-sm">
                  <p className="text-sm text-slate-700">Paso final: firma con rúbrica el contrato de preadmisión.</p>
                  <div className="rounded-xl border border-slate-300 bg-white p-2">
                    <p className="mb-2 text-xs font-semibold text-slate-600">Rúbrica del paciente</p>
                    <canvas
                      ref={signatureCanvasRef}
                      className="block h-[130px] w-full touch-none rounded-lg border border-slate-200 bg-white"
                      onPointerDown={startSignature}
                      onPointerMove={moveSignature}
                      onPointerUp={endSignature}
                      onPointerLeave={endSignature}
                    />
                    <button type="button" className="mt-2 bank-btn-ghost text-xs" onClick={clearSignature}>
                      Limpiar firma
                    </button>
                  </div>
                  <button type="button" className="bank-btn w-fit" onClick={signContract} disabled={generatingContract}>
                    Firmar contrato
                  </button>
                </div>
              )}

              {extracting && (
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
                  <p className="font-semibold">Validando documentación.</p>
                </div>
              )}

              {stage === "done" && speechSupported && !voiceOfferAnswered && (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                  <p className="font-semibold">¿Quieres conversar por voz con el asistente?</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button type="button" className="bank-btn" onClick={enableVoiceConversation}>
                      Sí, activar voz
                    </button>
                    <button type="button" className="bank-btn-ghost" onClick={declineVoiceConversation}>
                      No por ahora
                    </button>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Consultas rápidas al asistente</p>
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
                    placeholder="Escribe tu pregunta"
                  />
                  {voiceConversationEnabled && (
                    <button
                      type="button"
                      className="bank-btn-ghost inline-flex items-center gap-2"
                      onClick={startVoiceChatCapture}
                      disabled={listeningVoiceChat}
                    >
                      <Mic size={14} />
                      {listeningVoiceChat ? "Escuchando..." : "Hablar"}
                    </button>
                  )}
                  <button type="button" className="bank-btn px-4" onClick={sendChatQuestion}>
                    <Send size={14} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-teal-300 hover:bg-teal-50"
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
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Resumen de preadmisión</p>
              {!summary ? (
                <p className="mt-3 text-sm text-slate-500">Aún no hay datos validados. Completa el flujo del chatbot.</p>
              ) : (
                <div className="mt-2 space-y-1 text-sm text-slate-800">
                  <p><strong>Paciente:</strong> {summary.patientName}</p>
                  <p><strong>Documento:</strong> {summary.identityNumber}</p>
                  <p><strong>Cirugía:</strong> {summary.surgeryName}</p>
                  <p><strong>Fecha:</strong> {summary.surgeryDate}</p>
                  <p><strong>Área:</strong> {summary.clinicArea}</p>
                  <p><strong>Empresa Megafile:</strong> Clínica</p>
                  {operationId && <p><strong>Operación:</strong> {operationId}</p>}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Documentos cargados</p>
              {!files.length ? (
                <p className="mt-3 text-sm text-slate-500">Sin archivos cargados.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {files.map((file) => (
                    <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between rounded-xl border border-slate-200 p-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      {(stage === "identity" || stage === "documents") && (
                        <button type="button" className="bank-btn-ghost text-xs" onClick={() => removeFile(file)}>
                          Quitar
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
                Contrato de preadmisión
              </p>
              {contractPdfUrl ? (
                <iframe
                  title="Previsualizacion contrato PDF"
                  src={contractPdfUrl}
                  className="mt-2 h-80 w-full rounded-xl border border-slate-200"
                />
              ) : (
                <p className="mt-2 text-sm text-slate-500">Se generará al validar los documentos.</p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <FileText size={14} />
                Consentimiento informado
              </p>
              {consentPdfUrl ? (
                <iframe
                  title="Previsualizacion consentimiento informado PDF"
                  src={consentPdfUrl}
                  className="mt-2 h-80 w-full rounded-xl border border-slate-200"
                />
              ) : (
                <p className="mt-2 text-sm text-slate-500">Se generará junto con el contrato.</p>
              )}
            </section>

            <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
              <p className="inline-flex items-center gap-2 font-semibold">
                <ShieldCheck size={15} />
                Estado del flujo
              </p>
              <p className="mt-1 text-xs">
                {stage === "identity" && "Esperando documento de identidad"}
                {stage === "documents" && "Esperando cédula y orden de hospitalización"}
                {stage === "review" && "Documentos validados, contrato pendiente"}
                {stage === "sign" && "Contrato listo para firma"}
                {stage === "done" && "Preadmisión completada"}
              </p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
