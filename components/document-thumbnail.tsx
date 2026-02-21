"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type DocumentThumbnailProps = {
  documentId: string;
  mimeType: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  fill?: boolean;
};

export function DocumentThumbnail({
  documentId,
  mimeType,
  fallbackSrc = "/pdf-placeholder.svg",
  alt,
  className,
  fill
}: DocumentThumbnailProps) {
  const [pdfThumb, setPdfThumb] = useState<string | null>(null);

  const source = useMemo(() => {
    if (mimeType.startsWith("image/")) return `/api/documents/${documentId}`;
    if (mimeType === "application/pdf") return pdfThumb || fallbackSrc;
    return fallbackSrc;
  }, [documentId, fallbackSrc, mimeType, pdfThumb]);

  useEffect(() => {
    let active = true;

    async function buildPdfThumbnail() {
      if (mimeType !== "application/pdf") return;
      try {
        const response = await fetch(`/api/documents/${documentId}`);
        if (!response.ok) return;

        const bytes = new Uint8Array(await response.arrayBuffer());
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
        }

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.45 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return;
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        await page.render({ canvasContext: context, viewport }).promise;
        if (!active) return;
        setPdfThumb(canvas.toDataURL("image/jpeg", 0.78));
      } catch {
        // fallback placeholder
      }
    }

    void buildPdfThumbnail();
    return () => {
      active = false;
    };
  }, [documentId, mimeType]);

  return <Image src={source} alt={alt} fill={fill} className={className} unoptimized />;
}

