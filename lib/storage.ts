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
    const attempts: ("public" | "private")[] =
      preferredAccess === fallbackAccess ? [preferredAccess] : [preferredAccess, fallbackAccess];
    let lastError: unknown;

    for (const access of attempts) {
      try {
        const uploaded = await uploadWithAccess(access);
        return uploaded.url;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("No fue posible subir el archivo a Vercel Blob.");
  }

  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

export function getThumbnailForDocument(mimeType: string, storageUrl: string) {
  if (mimeType.startsWith("image/")) return storageUrl;
  return "/pdf-placeholder.svg";
}
