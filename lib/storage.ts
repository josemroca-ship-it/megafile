import { put } from "@vercel/blob";

export async function uploadDocument(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const key = `operations/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    let uploaded;
    try {
      uploaded = await put(key, Buffer.from(arrayBuffer), {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: file.type
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("private store")) throw error;

      // Fallback para stores privados de Vercel Blob.
      uploaded = await put(
        key,
        Buffer.from(arrayBuffer),
        {
          access: "private",
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: file.type
        } as any
      );
    }

    return uploaded.url;
  }

  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

export function getThumbnailForDocument(mimeType: string, storageUrl: string) {
  if (mimeType.startsWith("image/")) return storageUrl;
  return "/pdf-placeholder.svg";
}
