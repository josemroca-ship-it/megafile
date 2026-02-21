import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import pdfParse from "pdf-parse";

type ExtractedDoc = {
  fileName: string;
  mimeType: string;
  rawText: string;
  fields: Record<string, unknown>;
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

export async function extractDocumentData(file: File): Promise<ExtractedDoc> {
  const aiProvider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  const mimeType = file.type || "application/octet-stream";

  let rawText = "";
  if (mimeType === "application/pdf") {
    rawText = await readPdfText(file);
  }

  const prompt = `Analiza este documento bancario/identidad/factura y responde SOLO JSON con:
{
  "tipo_documento": "...",
  "campos_relevantes": {"clave":"valor"},
  "resumen": "..."
}
Si no puedes leer algo, déjalo en null.`;

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
    return {
      fileName: file.name,
      mimeType,
      rawText: text,
      fields: jsonBlock(text) as Record<string, unknown>
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
  return {
    fileName: file.name,
    mimeType,
    rawText: rawText || text,
    fields: jsonBlock(text) as Record<string, unknown>
  };
}

export async function answerSearchQuestion(input: {
  question: string;
  context: string;
}) {
  const aiProvider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();

  const prompt = `Eres un agente experto en operaciones bancarias.
Responde en español con precisión basado SOLO en este contexto.
Si falta información, dilo explícitamente.
Incluye una sección final \"referencias\" con los IDs de operación/documento usados.`;

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

  return "No hay proveedor de IA configurado. Define OPENAI_API_KEY o GEMINI_API_KEY.";
}
