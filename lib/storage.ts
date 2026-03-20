import { put } from "@vercel/blob";

export async function uploadDocument(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const safeName = file.name.replace(/\s+/g, "-");
  const uniquePart = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const key = `operations/${Date.now()}-${uniquePart}-${safeName}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const configuredAccess = (process.env.BLOB_ACCESS ?? "private").toLowerCase().trim();
    const primaryAccess: "public" | "private" = configuredAccess === "public" ? "public" : "private";

    async function putWith(access: "public" | "private") {
      return put(
        key,
        Buffer.from(arrayBuffer),
        {
          access,
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: file.type
        } as any
      );
    }

    try {
      const uploaded = await putWith(primaryAccess);
      return uploaded.url;
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const requiresPublic = message.includes('access must be "public"');
      const requiresPrivate = message.includes("cannot use public access on a private store");
      const oppositeAccess: "public" | "private" = primaryAccess === "public" ? "private" : "public";
      const shouldRetryWithOpposite =
        (primaryAccess === "private" && requiresPublic) ||
        (primaryAccess === "public" && requiresPrivate);

      if (!shouldRetryWithOpposite) {
        throw error instanceof Error
          ? error
          : new Error("No fue posible subir el archivo a Vercel Blob.");
      }

      try {
        const uploaded = await putWith(oppositeAccess);
        return uploaded.url;
      } catch (retryError) {
        throw retryError instanceof Error
          ? retryError
          : new Error("No fue posible subir el archivo a Vercel Blob.");
      }
    }
  }

  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

function parseDataUrl(url: string) {
  const match = url.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) return null;

  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || "";

  try {
    const bytes = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
    return { mimeType, bytes };
  } catch {
    return null;
  }
}

export async function readStoredDocument(input: { storageUrl: string; fallbackMimeType?: string }) {
  if (input.storageUrl.startsWith("data:")) {
    const parsed = parseDataUrl(input.storageUrl);
    if (!parsed) return null;
    return {
      mimeType: parsed.mimeType || input.fallbackMimeType || "application/octet-stream",
      bytes: parsed.bytes
    };
  }

  if (input.storageUrl.startsWith("http://") || input.storageUrl.startsWith("https://")) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const attempts = [
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
      { headers: undefined }
    ];

    for (const attempt of attempts) {
      const response = await fetch(input.storageUrl, { headers: attempt.headers });
      if (!response.ok) continue;

      const bytes = Buffer.from(await response.arrayBuffer());
      const mimeType = response.headers.get("content-type") || input.fallbackMimeType || "application/octet-stream";
      return { mimeType, bytes };
    }
  }

  return null;
}

export function getThumbnailForDocument(mimeType: string, storageUrl: string) {
  if (mimeType.startsWith("image/")) return storageUrl;
  return "/pdf-placeholder.svg";
}
