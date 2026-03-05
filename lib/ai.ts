import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import pdfParse from "pdf-parse";

type ExtractedDoc = {
  fileName: string;
  mimeType: string;
  rawText: string;
  fields: Record<string, unknown>;
};

function asObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function asItemsArray(fields: Record<string, unknown>) {
  const raw = fields.articulos;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === "object") as Array<Record<string, unknown>>;
}

function itemQuantityValue(item: Record<string, unknown>) {
  const candidates = [
    item.cantidad_recibida,
    item.cantidad,
    item.qty,
    item.cantidad_entregada,
    item.cantidad_solicitada
  ];
  const found = candidates.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
  return found ? String(found).trim() : "";
}

function inferDocType(fields: Record<string, unknown>) {
  const v = String(fields.tipo_documento ?? fields.tipoDocumento ?? fields.document_type ?? "").toLowerCase();
  return v;
}

function shouldRefineLineItems(fields: Record<string, unknown>) {
  const items = asItemsArray(fields);
  const type = inferDocType(fields);
  const tableLikely = type.includes("factura") || type.includes("recepcion") || type.includes("guia") || type.includes("transporte");
  if (!tableLikely) return false;

  if (items.length === 0) return true;
  if (items.length === 1) return false;

  const quantities = items.map(itemQuantityValue).filter(Boolean);
  if (quantities.length < 2) return true;
  const unique = new Set(quantities.map((q) => q.replace(/\s+/g, "")));
  // Patrón sospechoso: todas las filas con misma cantidad.
  return unique.size === 1;
}

function mergeLineItems(base: Record<string, unknown>, refined: Record<string, unknown>) {
  const refinedItems = asItemsArray(refined);
  if (refinedItems.length === 0) return base;
  return {
    ...base,
    ...refined,
    articulos: refinedItems
  };
}

async function readPdfText(file: File): Promise<string> {
  const data = Buffer.from(await file.arrayBuffer());
  try {
    const parsed = await pdfParse(data);
    return parsed.text?.trim() ?? "";
  } catch {
    return "";
  }
}

function jsonBlock(input: string) {
  const trimmed = input.trim();

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // seguimos con otros métodos
    }
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // seguimos con extracción por balance de llaves
    }
  }

  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }

    if (ch === "}") {
      if (depth > 0) depth--;
      if (depth === 0 && start >= 0) {
        const candidate = trimmed.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          start = -1;
        }
      }
    }
  }

  return {};
}

export async function extractDocumentData(file: File): Promise<ExtractedDoc> {
  const aiProvider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  const mimeType = file.type || "application/octet-stream";

  let rawText = "";
  if (mimeType === "application/pdf") {
    rawText = await readPdfText(file);
  }

  const prompt = `Analiza el documento y responde SOLO JSON válido.
Debes extraer con el mayor detalle posible, incluyendo tablas cuando existan.
Formato esperado:
{
  "tipo_documento": "factura|recepcion|guia_transporte|identidad|otro",
  "campos_relevantes": {
    "emisor": "...",
    "receptor": "...",
    "folio_numero": "...",
    "fecha_emision": "...",
    "moneda": "...",
    "subtotal": "...",
    "impuestos": "...",
    "total": "...",
    "mercaderia_descripcion": "...",
    "direccion": "...",
    "observaciones": "..."
  },
  "articulos": [
    {
      "descripcion": "...",
      "cantidad": "...",
      "unidad": "...",
      "precio_unitario": "...",
      "total_linea": "...",
      "codigo": "..."
    }
  ],
  "resumen": "..."
}
Reglas:
- Si es factura, intenta extraer TODAS las filas de la tabla de artículos en "articulos".
- Si es documento de recepción/guía, extrae mercancía, cantidades y totales.
- No inventes datos: usa null o string vacío cuando no sea legible.
- Mantén números y montos tal como aparecen en el documento.`;

  if (aiProvider === "gemini") {
    if (!process.env.GEMINI_API_KEY) {
      return { fileName: file.name, mimeType, rawText, fields: {} };
    }

    const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64
        }
      }
    ]);

    const text = result.response.text();
    return {
      fileName: file.name,
      mimeType,
      rawText: rawText || text,
      fields: jsonBlock(text) as Record<string, unknown>
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { fileName: file.name, mimeType, rawText, fields: {} };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const openAIModel = process.env.OPENAI_EXTRACTION_MODEL || "gpt-4.1";

  async function extractWithOpenAIPdf() {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const response = await openai.responses.create({
      model: openAIModel,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            {
              type: "input_file",
              filename: file.name,
              file_data: `data:${mimeType};base64,${base64}`
            } as any
          ]
        }
      ]
    });

    const text = response.output_text || "{}";
    const parsed = jsonBlock(text) as Record<string, unknown>;

    if (shouldRefineLineItems(asObject(parsed))) {
      const refined = await refineLineItemsWithOpenAI(openai, file, mimeType, parsed, openAIModel);
      return {
        fileName: file.name,
        mimeType,
        rawText: rawText || text,
        fields: mergeLineItems(parsed, refined)
      };
    }

    return {
      fileName: file.name,
      mimeType,
      rawText: rawText || text,
      fields: parsed
    };
  }

  if (mimeType === "application/pdf") {
    try {
      return await extractWithOpenAIPdf();
    } catch {
      // Si OpenAI falla, intentamos Gemini como contingencia.
      if (process.env.GEMINI_API_KEY) {
        const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
        const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType,
              data: base64
            }
          }
        ]);
        const text = result.response.text();
        return {
          fileName: file.name,
          mimeType,
          rawText: text,
          fields: jsonBlock(text) as Record<string, unknown>
        };
      }
    }
  }

  const isImage = mimeType.startsWith("image/");
  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "auto" | "high" }
  > = [{ type: "input_text", text: prompt }];

  if (isImage) {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const inputImage = `data:${mimeType};base64,${base64}`;
    content.push({ type: "input_image", image_url: inputImage, detail: "high" });
  } else {
    content.push({
      type: "input_text",
      text: `Texto detectado en documento:\n${rawText || "No se pudo extraer texto del archivo."}`
    });
  }

  const response = await openai.responses.create({
    model: openAIModel,
    input: [{ role: "user", content }]
  });

  const text = response.output_text || "{}";
  const parsed = jsonBlock(text) as Record<string, unknown>;
  if (shouldRefineLineItems(asObject(parsed))) {
    const refined = await refineLineItemsWithOpenAI(openai, file, mimeType, parsed, openAIModel);
    return {
      fileName: file.name,
      mimeType,
      rawText: rawText || text,
      fields: mergeLineItems(parsed, refined)
    };
  }

  return {
    fileName: file.name,
    mimeType,
    rawText: rawText || text,
    fields: parsed
  };
}

async function refineLineItemsWithOpenAI(
  openai: OpenAI,
  file: File,
  mimeType: string,
  current: Record<string, unknown>,
  model: string
) {
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const prompt = `Revisa SOLO la tabla de ítems y cantidades del documento.
Hay sospecha de extracción incorrecta (por ejemplo misma cantidad repetida en varias filas).
Devuelve SOLO JSON con este formato:
{
  "articulos": [
    {
      "descripcion": "...",
      "cantidad_solicitada": "...",
      "cantidad_recibida": "...",
      "precio_unitario": "...",
      "total_linea": "...",
      "codigo": "..."
    }
  ]
}
Reglas:
- No inventes filas.
- Si una columna no existe, déjala como string vacío.
- Respeta exactamente los valores visibles en el documento.
- Si no hay tabla, devuelve {"articulos":[]}.

Extracción actual a corregir:
${JSON.stringify(current)}`;

  const response = await openai.responses.create({
    model,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          {
            type: "input_file",
            filename: file.name,
            file_data: `data:${mimeType};base64,${base64}`
          } as any
        ]
      }
    ]
  });

  return jsonBlock(response.output_text || "{}") as Record<string, unknown>;
}

export async function answerSearchQuestion(input: {
  question: string;
  context: string;
  lang?: "es" | "en";
}) {
  const aiProvider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  const lang = input.lang === "en" ? "en" : "es";

  const prompt =
    lang === "en"
      ? `You are an expert in banking operations and document retrieval.
Respond in English with precision based ONLY on this context.
If information is missing, state it explicitly.
Include a final section called "references" with operation/document IDs used.`
      : `Eres un agente experto en operaciones bancarias.
Responde en español con precisión basado SOLO en este contexto.
Si falta información, dilo explícitamente.
Incluye una sección final "referencias" con los IDs de operación/documento usados.`;

  if (aiProvider === "gemini" && process.env.GEMINI_API_KEY) {
    const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`${prompt}\n\nPregunta: ${input.question}\n\nContexto:\n${input.context}`);
    return result.response.text();
  }

  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `${prompt}\n\nPregunta: ${input.question}\n\nContexto:\n${input.context}`
    });
    return response.output_text;
  }

  return lang === "en"
    ? "No AI provider configured. Define OPENAI_API_KEY or GEMINI_API_KEY."
    : "No hay proveedor de IA configurado. Define OPENAI_API_KEY o GEMINI_API_KEY.";
}
