type PiiRule = {
  type: "email" | "phone" | "rut" | "dni" | "iban" | "card";
  regex: RegExp;
};

const PII_RULES: PiiRule[] = [
  { type: "email", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { type: "phone", regex: /\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3,4}[\s.-]?\d{3,4}\b/g },
  { type: "rut", regex: /\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/g },
  { type: "dni", regex: /\b\d{7,12}\b/g },
  { type: "iban", regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi },
  { type: "card", regex: /\b(?:\d[ -]*?){13,19}\b/g }
];

export type PiiDetection = {
  type: PiiRule["type"];
  count: number;
  samples: string[];
};

export type PiiScanResult = {
  hasPii: boolean;
  detections: PiiDetection[];
};

function uniqueLimited(values: string[], limit = 5) {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).slice(0, limit);
}

export function scanPii(input: string): PiiScanResult {
  const text = input || "";
  const detections: PiiDetection[] = [];

  for (const rule of PII_RULES) {
    const matches = text.match(rule.regex) ?? [];
    if (matches.length === 0) continue;
    detections.push({
      type: rule.type,
      count: matches.length,
      samples: uniqueLimited(matches)
    });
  }

  return { hasPii: detections.length > 0, detections };
}

function maskToken(token: string) {
  if (token.length <= 4) return "*".repeat(token.length);
  return `${token.slice(0, 2)}${"*".repeat(Math.max(2, token.length - 4))}${token.slice(-2)}`;
}

export function redactPiiText(input: string) {
  let text = input || "";
  for (const rule of PII_RULES) {
    text = text.replace(rule.regex, (m) => maskToken(m));
  }
  return text;
}

export function detectSignatureHints(input: {
  rawText?: string | null;
  extractedFields?: unknown;
  fileName?: string | null;
}) {
  const haystack = `${input.fileName ?? ""}\n${input.rawText ?? ""}\n${JSON.stringify(input.extractedFields ?? {})}`.toLowerCase();
  const hints = ["firma", "signed", "signature", "signed by", "signado", "autorizado por"].filter((token) =>
    haystack.includes(token)
  );
  return {
    hasSignature: hints.length > 0,
    hints: uniqueLimited(hints, 10)
  };
}

