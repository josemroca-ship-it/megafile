import { put } from "@vercel/blob";

export async function uploadDocument(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const key = `operations/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const configuredAccess = (process.env.BLOB_ACCESS ?? "private").toLowerCase();
    const access = configuredAccess === "public" ? "public" : "private";
    const uploaded = await put(
      key,
      Buffer.from(arrayBuffer),
      {
        access,
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: file.type
      } as any
    );
    return uploaded.url;
  }

  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

export function getThumbnailForDocument(mimeType: string, storageUrl: string) {
  if (mimeType.startsWith("image/")) return storageUrl;
  return "/pdf-placeholder.svg";
}
