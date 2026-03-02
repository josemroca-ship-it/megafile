import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";

const root = process.cwd();
const outputPath = path.join(root, "generated", "megafy-resumen-comercial.pdf");
const logoPath = path.join(root, "public", "megafy-logo.png");

function dataUrlFromPng(filePath) {
  const bytes = fs.readFileSync(filePath);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 6, opts = {}) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y, opts);
  return y + lines.length * lineHeight;
}

function pill(doc, { x, y, w, h, text, fill = [236, 254, 255], stroke = [103, 232, 249], textColor = [8, 145, 178] }) {
  doc.setFillColor(...fill);
  doc.setDrawColor(...stroke);
  doc.roundedRect(x, y, w, h, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...textColor);
  doc.text(text, x + 3, y + 5.5);
}

function statCard(doc, x, y, w, h, title, body) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 5, 5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(title, x + 5, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  addWrappedText(doc, body, x + 5, y + 14, w - 10, 4.6);
}

function featureCard(doc, x, y, w, h, title, body) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 4, 4, "FD");
  doc.setFillColor(224, 242, 254);
  doc.roundedRect(x + 4, y + 4, 8, 8, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(title, x + 15, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  addWrappedText(doc, body, x + 4, y + 18, w - 8, 4.3);
}

function sectionTitle(doc, title, subtitle, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 18, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 18, y + 6);
}

function bulletList(doc, items, x, y, maxWidth, lineHeight = 5.3) {
  let cursor = y;
  for (const item of items) {
    doc.setFillColor(16, 185, 129);
    doc.circle(x + 1.5, cursor - 1.2, 1.1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(item, maxWidth - 5);
    doc.text(lines, x + 5, cursor);
    cursor += lines.length * lineHeight;
  }
  return cursor;
}

function footer(doc, page, total) {
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(18, pageH - 12, 192, pageH - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Megafy · Resumen comercial del sistema", 18, pageH - 7);
  doc.text(`Página ${page} de ${total}`, 170, pageH - 7);
}

function addBackground(doc) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(247, 250, 252);
  doc.rect(0, 0, w, h, "F");
  doc.setFillColor(224, 242, 254);
  doc.circle(175, 22, 26, "F");
  doc.setFillColor(236, 253, 245);
  doc.circle(24, 250, 28, "F");
}

function addHeader(doc, logoData) {
  doc.addImage(logoData, "PNG", 18, 12, 34, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(8, 47, 73);
  doc.text("Plataforma de gestión documental asistida por IA", 56, 19);
}

function page1(doc, logoData) {
  addBackground(doc);
  addHeader(doc, logoData);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(18, 30, 174, 90, 8, 8, "FD");

  pill(doc, { x: 24, y: 36, w: 44, h: 8, text: "ONE-PAGE COMERCIAL" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  addWrappedText(
    doc,
    "Megafy transforma documentos operativos en conocimiento buscable y accionable",
    24,
    52,
    112,
    8
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  addWrappedText(
    doc,
    "Centraliza expedientes, extrae datos con IA, habilita búsqueda conversacional con evidencias y genera reportes para equipos de content management, backoffice, compliance y operaciones.",
    24,
    75,
    110,
    5.4
  );

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(24, 96, 54, 11, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("Gestión + IA + Gobierno", 30, 103);

  doc.setFillColor(6, 182, 212);
  doc.roundedRect(82, 96, 48, 11, 4, 4, "F");
  doc.text("Búsqueda con evidencia", 86, 103);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(138, 38, 48, 74, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Valor inmediato", 144, 47);
  const quickWins = [
    "Menos tiempo buscando documentos",
    "Mejor trazabilidad por operación",
    "Respuestas rápidas a auditorías",
    "Datos listos para reportes"
  ];
  let y = 56;
  for (const item of quickWins) {
    doc.setFillColor(34, 197, 94);
    doc.circle(146, y - 1.3, 1.1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.3);
    doc.setTextColor(51, 65, 85);
    addWrappedText(doc, item, 150, y, 32, 4.3);
    y += 11;
  }

  sectionTitle(doc, "Propuesta de valor", "Pensado para gestión de contenido documental en entornos operativos", 134);

  statCard(
    doc,
    18,
    146,
    55,
    34,
    "Captura documental",
    "Carga de PDFs e imágenes, drag & drop y captura desde cámara para expedientes y respaldos."
  );
  statCard(
    doc,
    77,
    146,
    55,
    34,
    "Extracción IA",
    "Procesamiento en segundo plano para extraer texto y campos útiles para consulta y seguimiento."
  );
  statCard(
    doc,
    136,
    146,
    56,
    34,
    "Consulta y control",
    "Búsqueda por lenguaje natural, evidencias documentales y gobierno por tipo de documento."
  );

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(18, 186, 174, 84, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Por qué gusta a equipos de Content Management", 24, 196);

  bulletList(
    doc,
    [
      "Convierte archivos dispersos en contenido consultable por IA sin cambiar el flujo operativo base.",
      "Reduce dependencia de conocimiento tribal gracias a respuestas apoyadas por evidencias y snippets.",
      "Facilita recuperación de contenido por cliente, documento y operación desde una única interfaz.",
      "Entrega base analítica para medir volumen documental, actividad y tendencias."
    ],
    24,
    206,
    162
  );
}

function page2(doc) {
  addBackground(doc);

  sectionTitle(doc, "Características clave del sistema", "Funcionalidades actuales para captura, búsqueda, reporting y control", 24);

  const features = [
    ["Alta de operaciones con documentos", "Registro de cliente + identificación + múltiples documentos asociados en un flujo único."],
    ["Carga móvil y escritorio", "Subida por selección manual, arrastrar archivos o captura de fotos desde dispositivo móvil."],
    ["Compresión de imágenes", "Optimización de imágenes previa a carga para mejorar tiempos de transferencia."],
    ["Extracción de campos por IA", "Extracción automática de texto y campos relevantes para consulta posterior."],
    ["Resumen de operación", "Consolidación de resultados de extracción en un resumen asociado a la operación."],
    ["Buscador conversacional", "Preguntas en lenguaje natural sobre documentos y operaciones con respuesta del agente."],
    ["Evidencias visuales", "Miniaturas, snippets, motivo de match y acceso directo al documento fuente."],
    ["Modos de búsqueda", "Consulta precisa o amplia según necesidad del analista."],
    ["Reportes inteligentes", "Reportes por evolución, tipos de documento, top clientes y otros patrones operativos."],
    ["Exportación ejecutiva", "Descarga de resultados en CSV y PDF para seguimiento y comunicación interna."],
    ["KPIs del dashboard", "Operaciones, documentos y clientes únicos por período configurable."],
    ["Seguridad documental", "Matriz de permisos por grupo y tipo documental para gobierno de acceso."]
  ];

  let x = 18;
  let y = 38;
  const w = 55;
  const h = 34;
  let count = 0;
  for (const [title, body] of features) {
    featureCard(doc, x, y, w, h, title, body);
    x += 59;
    count += 1;
    if (count % 3 === 0) {
      x = 18;
      y += 38;
    }
  }

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(18, 198, 174, 27, 5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("Arquitectura orientada a despliegue moderno", 24, 209);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Base Next.js + Prisma + PostgreSQL, integración con IA (OpenAI/Gemini) y almacenamiento compatible con Vercel Blob.",
    24,
    217
  );

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(18, 231, 84, 40, 5, 5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Roles y flujo operativo", 24, 240);
  bulletList(
    doc,
    [
      "Capturador: registra operaciones y documentos.",
      "Analista: busca, consulta y genera reportes."
    ],
    24,
    249,
    72,
    4.8
  );

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(108, 231, 84, 40, 5, 5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Ideal para", 114, 240);
  bulletList(
    doc,
    [
      "Content operations y gestión documental",
      "Backoffice y cumplimiento",
      "Operaciones multientidad"
    ],
    114,
    249,
    72,
    4.8
  );
}

function page3(doc) {
  addBackground(doc);

  sectionTitle(doc, "Beneficios comerciales y adopción", "Cómo presentar Megafy a stakeholders internos o clientes", 24);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(18, 36, 84, 74, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Beneficios de negocio", 24, 46);
  bulletList(
    doc,
    [
      "Acelera tiempos de respuesta frente a requerimientos internos y auditorías.",
      "Reduce fricción entre captura documental y análisis de información.",
      "Mejora consistencia de datos extraídos desde documentos.",
      "Escala recuperación de contenido sin aumentar carga manual."
    ],
    24,
    55,
    72
  );

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(108, 36, 84, 74, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Mensajes de venta (B2B)", 114, 46);
  bulletList(
    doc,
    [
      "De documentos estáticos a conocimiento operativo consultable.",
      "IA con evidencias, no respuestas opacas.",
      "Reporting listo para seguimiento y decisiones.",
      "Gobierno documental alineado con seguridad de acceso."
    ],
    114,
    55,
    72
  );

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(18, 118, 174, 58, 7, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("Caso de uso de referencia (Content Management)", 24, 132);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);
  addWrappedText(
    doc,
    "Un equipo de operaciones recibe expedientes con facturas, identificaciones y respaldos. Megafy permite centralizar la carga, extraer metadatos, buscar por prompt y emitir reportes de actividad documental sin recorrer carpetas manualmente.",
    24,
    142,
    162,
    5
  );
  doc.setFillColor(6, 182, 212);
  doc.roundedRect(24, 160, 60, 9, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Resultado: rapidez + control + trazabilidad", 27, 166);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(18, 184, 174, 54, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text("Resumen ejecutivo para decisión", 24, 195);
  bulletList(
    doc,
    [
      "Megafy unifica captura, extracción IA, búsqueda asistida y reporting documental.",
      "Aporta valor directo a equipos de content management y operaciones con alto volumen de documentos.",
      "Permite comenzar con flujos actuales y evolucionar hacia una gestión documental más inteligente."
    ],
    24,
    205,
    162
  );

  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(18, 244, 174, 27, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(6, 95, 70);
  doc.text("CTA sugerido", 24, 254);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Proponer demo guiada con casos reales de expedientes y métricas de tiempo de búsqueda.", 24, 262);
}

function main() {
  const logoData = dataUrlFromPng(logoPath);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const totalPages = 3;

  page1(doc, logoData);
  footer(doc, 1, totalPages);

  doc.addPage();
  page2(doc);
  footer(doc, 2, totalPages);

  doc.addPage();
  page3(doc);
  footer(doc, 3, totalPages);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  doc.save(outputPath);
  console.log(outputPath);
}

main();
