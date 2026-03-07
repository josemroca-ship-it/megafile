import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import pdfParse from "pdf-parse";

type ExtractedDoc = {
  fileName: string;
  mimeType: string;
  rawText: string;
  fields: Record<string, unknown>;
  confidenceGlobal: number | null;
  confidenceByField: Record<string, number>;
};

export type SignatureDetection = {
  hasSignature: boolean;
  confidence: number | null;
  evidence: string[];
};

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

function clampConfidence(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return null;
  if (n > 1 && n <= 100) return Number((n / 100).toFixed(2));
  return Number(Math.max(0, Math.min(1, n)).toFixed(2));
}

function flattenConfidenceObject(input: unknown, prefix = ""): Record<string, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flattenConfidenceObject(value, nextKey));
      continue;
    }
    const parsed = clampConfidence(value);
    if (parsed !== null) out[nextKey] = parsed;
  }
  return out;
}

function normalizeExtractionPayload(payload: Record<string, unknown>) {
  const confidenceByFieldRaw =
    (payload.confianza_campos as unknown) ??
    (payload.field_confidence as unknown) ??
    (payload.confidence_by_field as unknown) ??
    {};
  const confidenceByField = flattenConfidenceObject(confidenceByFieldRaw);

  let confidenceGlobal =
    clampConfidence(payload.confianza_global) ??
    clampConfidence(payload.global_confidence) ??
    clampConfidence(payload.confidence_global);
  if (confidenceGlobal === null && Object.keys(confidenceByField).length > 0) {
    const values = Object.values(confidenceByField);
    confidenceGlobal = Number((values.reduce((acc, n) => acc + n, 0) / values.length).toFixed(2));
  }

  return { confidenceGlobal, confidenceByField };
}

function normalizeStringList(input: unknown) {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
      )
    ).slice(0, 6);
  }
  if (typeof input === "string" && input.trim()) return [input.trim()];
  return [] as string[];
}

export async function extractDocumentData(
  file: File,
  options?: { customPrompt?: string | null }
): Promise<ExtractedDoc> {
  const aiProvider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  const mimeType = file.type || "application/octet-stream";

  let rawText = "";
  if (mimeType === "application/pdf") {
    rawText = await readPdfText(file);
  }

  const basePrompt = `Analiza este documento bancario/identidad/factura y responde SOLO JSON con:
{
  "tipo_documento": "...",
  "campos_relevantes": {"clave":"valor"},
  "resumen": "...",
  "confianza_global": 0.0-1.0,
  "confianza_campos": {"campos_relevantes.clave": 0.0-1.0}
}
Si no puedes leer algo, déjalo en null.`;
  const prompt = options?.customPrompt?.trim()
    ? `${options.customPrompt.trim()}\n\nFormato de salida obligatorio:\n${basePrompt}`
    : basePrompt;

  if (aiProvider === "gemini") {
    if (!process.env.GEMINI_API_KEY) {
      return { fileName: file.name, mimeType, rawText, fields: {}, confidenceGlobal: null, confidenceByField: {} };
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
    const payload = jsonBlock(text) as Record<string, unknown>;
    const confidence = normalizeExtractionPayload(payload);
    return {
      fileName: file.name,
      mimeType,
      rawText: rawText || text,
      fields: payload,
      confidenceGlobal: confidence.confidenceGlobal,
      confidenceByField: confidence.confidenceByField
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { fileName: file.name, mimeType, rawText, fields: {}, confidenceGlobal: null, confidenceByField: {} };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async function extractWithOpenAIPdf() {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
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
    const payload = jsonBlock(text) as Record<string, unknown>;
    const confidence = normalizeExtractionPayload(payload);
    return {
      fileName: file.name,
      mimeType,
      rawText: text,
      fields: payload,
      confidenceGlobal: confidence.confidenceGlobal,
      confidenceByField: confidence.confidenceByField
    };
  }

  if (mimeType === "application/pdf" && !rawText) {
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
        const payload = jsonBlock(text) as Record<string, unknown>;
        const confidence = normalizeExtractionPayload(payload);
        return {
          fileName: file.name,
          mimeType,
          rawText: text,
          fields: payload,
          confidenceGlobal: confidence.confidenceGlobal,
          confidenceByField: confidence.confidenceByField
        };
      }
    }
  }

  const isImage = mimeType.startsWith("image/");
  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "auto" }
  > = [{ type: "input_text", text: prompt }];

  if (isImage) {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const inputImage = `data:${mimeType};base64,${base64}`;
    content.push({ type: "input_image", image_url: inputImage, detail: "auto" });
  } else {
    content.push({
      type: "input_text",
      text: `Texto detectado en documento:\n${rawText || "No se pudo extraer texto del archivo."}`
    });
  }

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [{ role: "user", content }]
  });

  const text = response.output_text || "{}";
  const payload = jsonBlock(text) as Record<string, unknown>;
  const confidence = normalizeExtractionPayload(payload);
  return {
    fileName: file.name,
    mimeType,
    rawText: rawText || text,
    fields: payload,
    confidenceGlobal: confidence.confidenceGlobal,
    confidenceByField: confidence.confidenceByField
  };
}

export async function detectDocumentSignatureWithAI(file: File): Promise<SignatureDetection> {
  const aiProvider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  const mimeType = file.type || "application/octet-stream";
  const prompt = `Analyze this document and return ONLY valid JSON:
{
  "has_signature": true|false,
  "signature_confidence": 0.0-1.0,
  "evidence": ["short reason 1", "short reason 2"]
}
Rules:
- Mark true only if there is a visible handwritten/digital signature or explicit signed block.
- If uncertain, return false and low confidence.
- No extra text outside JSON.`;

  if (aiProvider === "gemini" && process.env.GEMINI_API_KEY) {
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
    const payload = jsonBlock(result.response.text()) as Record<string, unknown>;
    const hasSignature = Boolean(
      payload.has_signature ?? payload.signature_present ?? payload.firma_presente ?? payload.tiene_firma ?? false
    );
    const confidence =
      clampConfidence(payload.signature_confidence) ??
      clampConfidence(payload.confidence) ??
      clampConfidence(payload.confianza);
    const evidence = normalizeStringList(payload.evidence ?? payload.hints ?? payload.razones);
    return { hasSignature, confidence, evidence };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { hasSignature: false, confidence: null, evidence: [] };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "auto" }
    | { type: "input_file"; filename: string; file_data: string }
  > = [{ type: "input_text", text: prompt }];

  if (mimeType.startsWith("image/")) {
    content.push({ type: "input_image", image_url: `data:${mimeType};base64,${base64}`, detail: "auto" });
  } else {
    content.push({
      type: "input_file",
      filename: file.name,
      file_data: `data:${mimeType};base64,${base64}`
    });
  }

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [{ role: "user", content }]
  });

  const payload = jsonBlock(response.output_text || "{}") as Record<string, unknown>;
  const hasSignature = Boolean(
    payload.has_signature ?? payload.signature_present ?? payload.firma_presente ?? payload.tiene_firma ?? false
  );
  const confidence =
    clampConfidence(payload.signature_confidence) ??
    clampConfidence(payload.confidence) ??
    clampConfidence(payload.confianza);
  const evidence = normalizeStringList(payload.evidence ?? payload.hints ?? payload.razones);
  return { hasSignature, confidence, evidence };
}

export async function answerSearchQuestion(input: {
  question: string;
  context: string;
  lang?: "es" | "en";
  customPrompt?: string | null;
}) {
  const aiProvider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  const lang = input.lang === "en" ? "en" : "es";

  const basePrompt =
    lang === "en"
      ? `You are an expert in banking operations and document retrieval.
Respond in English with precision based ONLY on this context.
If information is missing, state it explicitly.
Include a final section called "references" with operation/document IDs used.`
      : `Eres un agente experto en operaciones bancarias.
Responde en español con precisión basado SOLO en este contexto.
Si falta información, dilo explícitamente.
Incluye una sección final "referencias" con los IDs de operación/documento usados.`;
  const prompt = input.customPrompt?.trim()
    ? `${input.customPrompt.trim()}\n\nReglas obligatorias:\n${basePrompt}`
    : basePrompt;

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
