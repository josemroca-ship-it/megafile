import { put } from "@vercel/blob";

export async function uploadDocument(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const key = `operations/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const uploadWithAccess = async (access: "public" | "private") => {
    return put(
      key,
      Buffer.from(arrayBuffer),
      {
        access,
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: file.type
      } as any
    );
  };

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const preferredAccess = (process.env.BLOB_ACCESS ?? "public").toLowerCase() === "private" ? "private" : "public";
    const fallbackAccess = preferredAccess === "public" ? "private" : "public";

    try {
      const uploaded = await uploadWithAccess(preferredAccess);
      return uploaded.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const normalized = message.toLowerCase();
      const accessRelatedError =
        normalized.includes("private store") ||
        normalized.includes("access must be") ||
        normalized.includes("public") ||
        normalized.includes("private");
      if (!accessRelatedError) throw error;
    }
    const uploaded = await uploadWithAccess(fallbackAccess);
    return uploaded.url;
  }

  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

export function getThumbnailForDocument(mimeType: string, storageUrl: string) {
  if (mimeType.startsWith("image/")) return storageUrl;
  return "/pdf-placeholder.svg";
}
