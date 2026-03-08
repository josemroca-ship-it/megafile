import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import pdfParse from "pdf-parse";

type AiProvider = "openai" | "gemini" | "anthropic";
type ProviderApiKeys = {
  openaiApiKey?: string | null;
  geminiApiKey?: string | null;
  anthropicApiKey?: string | null;
};

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

function parseBooleanLike(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "yes", "si", "sí", "1"].includes(v)) return true;
    if (["false", "no", "0"].includes(v)) return false;
  }
  return null;
}

function normalizeSignaturePayload(payload: Record<string, unknown>): SignatureDetection {
  const explicit =
    parseBooleanLike(payload.has_signature) ??
    parseBooleanLike(payload.signature_present) ??
    parseBooleanLike(payload.firma_presente) ??
    parseBooleanLike(payload.tiene_firma);

  const confidence =
    clampConfidence(payload.signature_confidence) ??
    clampConfidence(payload.confidence) ??
    clampConfidence(payload.confianza);
  const evidence = normalizeStringList(payload.evidence ?? payload.hints ?? payload.razones);

  const inferredByEvidence = evidence.some((item) =>
    /firma|signature|signed|rubric|autogra/i.test(item)
  );
  const inferredByConfidence = typeof confidence === "number" && confidence >= 0.45;
  const hasSignature = explicit ?? (inferredByEvidence || inferredByConfidence);

  return { hasSignature, confidence, evidence };
}

function resolveApiKeys(keys?: ProviderApiKeys | null) {
  return {
    openai: keys?.openaiApiKey?.trim() || process.env.OPENAI_API_KEY || "",
    gemini: keys?.geminiApiKey?.trim() || process.env.GEMINI_API_KEY || "",
    anthropic: keys?.anthropicApiKey?.trim() || process.env.ANTHROPIC_API_KEY || ""
  };
}

async function callAnthropicText(input: {
  apiKey: string;
  model: string;
  system?: string;
  userText: string;
  mimeType?: string;
  base64?: string;
}) {
  const content: Array<Record<string, unknown>> = [];
  if (input.base64 && input.mimeType) {
    if (input.mimeType.startsWith("image/")) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: input.mimeType,
          data: input.base64
        }
      });
    } else {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: input.mimeType,
          data: input.base64
        }
      });
    }
  }
  content.push({ type: "text", text: input.userText });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: 1200,
      ...(input.system ? { system: input.system } : {}),
      messages: [{ role: "user", content }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic error ${response.status}`);
  }
  const data = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = (data.content ?? [])
    .filter((item) => item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();
  return text || "{}";
}

export async function extractDocumentData(
  file: File,
  options?: {
    customPrompt?: string | null;
    provider?: AiProvider | null;
    model?: string | null;
    apiKeys?: ProviderApiKeys | null;
  }
): Promise<ExtractedDoc> {
  const aiProvider = (options?.provider ?? process.env.AI_PROVIDER ?? "openai").toLowerCase();
  const providerKeys = resolveApiKeys(options?.apiKeys);
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
    if (!providerKeys.gemini) {
      return { fileName: file.name, mimeType, rawText, fields: {}, confidenceGlobal: null, confidenceByField: {} };
    }

    const gemini = new GoogleGenerativeAI(providerKeys.gemini);
    const model = gemini.getGenerativeModel({ model: options?.model?.trim() || "gemini-1.5-flash" });
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

  if (aiProvider === "anthropic") {
    if (!providerKeys.anthropic) {
      return { fileName: file.name, mimeType, rawText, fields: {}, confidenceGlobal: null, confidenceByField: {} };
    }
    try {
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const text = await callAnthropicText({
        apiKey: providerKeys.anthropic,
        model: options?.model?.trim() || "claude-3-5-sonnet-latest",
        userText: prompt,
        mimeType,
        base64
      });
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
    } catch {
      return { fileName: file.name, mimeType, rawText, fields: {}, confidenceGlobal: null, confidenceByField: {} };
    }
  }

  if (!providerKeys.openai) {
    return { fileName: file.name, mimeType, rawText, fields: {}, confidenceGlobal: null, confidenceByField: {} };
  }

  const openai = new OpenAI({ apiKey: providerKeys.openai });

  async function extractWithOpenAIPdf() {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const response = await openai.responses.create({
      model: options?.model?.trim() || "gpt-4.1-mini",
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
      if (providerKeys.gemini) {
        const gemini = new GoogleGenerativeAI(providerKeys.gemini);
        const model = gemini.getGenerativeModel({ model: options?.model?.trim() || "gemini-1.5-flash" });
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
    model: options?.model?.trim() || "gpt-4.1-mini",
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

export async function detectDocumentSignatureWithAI(
  file: File,
  options?: { provider?: AiProvider | null; model?: string | null; apiKeys?: ProviderApiKeys | null }
): Promise<SignatureDetection> {
  const aiProvider = (options?.provider ?? process.env.AI_PROVIDER ?? "openai").toLowerCase();
  const providerKeys = resolveApiKeys(options?.apiKeys);
  const mimeType = file.type || "application/octet-stream";
  const prompt = `Analyze this document visually and return ONLY valid JSON:
{
  "has_signature": true|false,
  "signature_confidence": 0.0-1.0,
  "evidence": ["short reason 1", "short reason 2"]
}
Rules:
- Detect handwritten signatures, initials, autograph-like strokes, and digital signature blocks/stamps.
- Mark true only if there is visual evidence of signature-like mark or explicit signed section.
- If uncertain, return false and low confidence.
- No extra text outside JSON.`;

  async function detectWithGemini() {
    if (!providerKeys.gemini) return null;
    const gemini = new GoogleGenerativeAI(providerKeys.gemini);
    const model = gemini.getGenerativeModel({ model: options?.model?.trim() || "gemini-1.5-flash" });
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
    return normalizeSignaturePayload(payload);
  }

  async function detectWithOpenAI() {
    if (!providerKeys.openai) return null;
    const openai = new OpenAI({ apiKey: providerKeys.openai });
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
      model: options?.model?.trim() || "gpt-4.1",
      input: [{ role: "user", content }]
    });
    const payload = jsonBlock(response.output_text || "{}") as Record<string, unknown>;
    return normalizeSignaturePayload(payload);
  }

  async function detectWithAnthropic() {
    if (!providerKeys.anthropic) return null;
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const text = await callAnthropicText({
      apiKey: providerKeys.anthropic,
      model: options?.model?.trim() || "claude-3-5-sonnet-latest",
      userText: prompt,
      mimeType,
      base64
    });
    const payload = jsonBlock(text) as Record<string, unknown>;
    return normalizeSignaturePayload(payload);
  }

  try {
    if (aiProvider === "gemini") {
      const primary = await detectWithGemini();
      if (primary?.hasSignature) return primary;
      const secondary = await detectWithOpenAI();
      if (!primary && !secondary) return { hasSignature: false, confidence: null, evidence: [] };
      if (!secondary) return primary ?? { hasSignature: false, confidence: null, evidence: [] };
      if (!primary) return secondary;
      return {
        hasSignature: primary.hasSignature || secondary.hasSignature,
        confidence: Math.max(primary.confidence ?? 0, secondary.confidence ?? 0),
        evidence: Array.from(new Set([...primary.evidence, ...secondary.evidence])).slice(0, 8)
      };
    }

    if (aiProvider === "anthropic") {
      const primary = await detectWithAnthropic();
      if (primary?.hasSignature) return primary;
      const secondary = await detectWithOpenAI();
      if (!secondary) return primary ?? { hasSignature: false, confidence: null, evidence: [] };
      if (!primary) return secondary;
      return {
        hasSignature: primary.hasSignature || secondary.hasSignature,
        confidence: Math.max(primary.confidence ?? 0, secondary.confidence ?? 0),
        evidence: Array.from(new Set([...primary.evidence, ...secondary.evidence])).slice(0, 8)
      };
    }

    const primary = await detectWithOpenAI();
    if (primary?.hasSignature) return primary;
    const secondary = await detectWithGemini();
    if (!primary && !secondary) return { hasSignature: false, confidence: null, evidence: [] };
    if (!secondary) return primary ?? { hasSignature: false, confidence: null, evidence: [] };
    if (!primary) return secondary;
    return {
      hasSignature: primary.hasSignature || secondary.hasSignature,
      confidence: Math.max(primary.confidence ?? 0, secondary.confidence ?? 0),
      evidence: Array.from(new Set([...primary.evidence, ...secondary.evidence])).slice(0, 8)
    };
  } catch {
    return { hasSignature: false, confidence: null, evidence: [] };
  }
}

export async function answerSearchQuestion(input: {
  question: string;
  context: string;
  lang?: "es" | "en";
  customPrompt?: string | null;
  provider?: AiProvider | null;
  model?: string | null;
  apiKeys?: ProviderApiKeys | null;
}) {
  const aiProvider = (input.provider ?? process.env.AI_PROVIDER ?? "openai").toLowerCase();
  const providerKeys = resolveApiKeys(input.apiKeys);
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

  if (aiProvider === "gemini" && providerKeys.gemini) {
    const gemini = new GoogleGenerativeAI(providerKeys.gemini);
    const model = gemini.getGenerativeModel({ model: input.model?.trim() || "gemini-1.5-flash" });
    const result = await model.generateContent(`${prompt}\n\nPregunta: ${input.question}\n\nContexto:\n${input.context}`);
    return result.response.text();
  }

  if (aiProvider === "anthropic" && providerKeys.anthropic) {
    const text = await callAnthropicText({
      apiKey: providerKeys.anthropic,
      model: input.model?.trim() || "claude-3-5-sonnet-latest",
      system: prompt,
      userText: `Pregunta: ${input.question}\n\nContexto:\n${input.context}`
    });
    return text;
  }

  if (providerKeys.openai) {
    const openai = new OpenAI({ apiKey: providerKeys.openai });
    const response = await openai.responses.create({
      model: input.model?.trim() || "gpt-4.1-mini",
      input: `${prompt}\n\nPregunta: ${input.question}\n\nContexto:\n${input.context}`
    });
    return response.output_text;
  }

  return lang === "en"
    ? "No AI provider configured. Define provider API key (OpenAI/Gemini/Anthropic)."
    : "No hay proveedor de IA configurado. Define API key del proveedor (OpenAI/Gemini/Anthropic).";
}
