"use client";

import { Camera, FileText, FolderUp, Trash2, UploadCloud } from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

type Result = {
  operationId: string;
  documents: Array<{ fileName: string; fields: Record<string, unknown> }>;
};

export function NewOperationForm() {
  const [clientName, setClientName] = useState("");
  const [clientRut, setClientRut] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const totalSizeMb = useMemo(() => files.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024), [files]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [`${f.name}-${f.size}-${f.lastModified}`, f]));
      for (const file of incoming) {
        map.set(`${file.name}-${file.size}-${file.lastModified}`, file);
      }
      return Array.from(map.values());
    });
  }

  function removeFile(target: File) {
    setFiles((prev) => prev.filter((f) => !(f.name === target.name && f.size === target.size && f.lastModified === target.lastModified)));
  }

  async function compressImageForUpload(file: File) {
    const bitmap = await createImageBitmap(file);
    const maxW = 1800;
    const maxH = 1800;
    const scale = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.(png|heic|heif|webp)$/i, ".jpg"), { type: "image/jpeg" });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setError("Debes adjuntar al menos un documento.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const compressedFiles = await Promise.all(
      files.map(async (file) => {
        if (!file.type.startsWith("image/")) return file;
        try {
          return await compressImageForUpload(file);
        } catch {
          return file;
        }
      })
    );

    async function uploadWithFallback(file: File) {
      const safeName = file.name.replace(/\s+/g, "-");
      const key = `operations/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

      const tryUpload = async (access: "private" | "public") => {
        return upload(key, file, {
          access,
          handleUploadUrl: "/api/blob/upload",
          multipart: file.size > 4 * 1024 * 1024,
          contentType: file.type || undefined
        });
      };

      try {
        return await tryUpload("private");
      } catch {
        return tryUpload("public");
      }
    }

    let response: Response;
    try {
      const uploadedDocuments: Array<{ fileName: string; mimeType: string; storageUrl: string }> = [];
      for (const file of compressedFiles) {
        const blob = await uploadWithFallback(file);
        uploadedDocuments.push({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          storageUrl: blob.url
        });
      }

      response = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientRut,
          documents: uploadedDocuments
        })
      });
    } catch {
      const form = new FormData();
      form.append("clientName", clientName);
      form.append("clientRut", clientRut);
      compressedFiles.forEach((file) => form.append("documents", file));
      response = await fetch("/api/operations", { method: "POST", body: form });
    }
    const data = (await response.json().catch(() => null)) as
      | { error?: string; operationId?: string; documents?: Array<{ fileName: string; fields: Record<string, unknown> }> }
      | null;

    if (!response.ok || !data?.operationId) {
      const raw = data?.error ?? `No fue posible crear la operación (HTTP ${response.status}).`;
      setError(raw);
      setLoading(false);
      return;
    }

    setResult({ operationId: data.operationId, documents: data.documents ?? [] });
    void fetch("/api/operations/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ operationId: data.operationId })
    });
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
    setLoading(false);
  }

  return (
    <section className="space-y-5 reveal-soft">
      <article className="bank-card hover-lift reveal p-6 md:p-8" style={{ animationDelay: "50ms" }}>
        <h2 className="font-display text-3xl text-navy">Añadir operación con agente IA</h2>
        <p className="mt-2 text-sm text-slate-600">
          Carga la documentación del cliente y el agente extraerá campos relevantes para consulta posterior.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="bank-label">Nombre del cliente</label>
              <input className="bank-input" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </div>
            <div>
              <label className="bank-label">Identificación</label>
              <input className="bank-input" value={clientRut} onChange={(e) => setClientRut(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="bank-label">Documentos (facturas, cédula, respaldos)</label>
            <input
              ref={inputRef}
              className="hidden"
              type="file"
              multiple
              accept="application/pdf,image/*"
              onChange={(e) => addFiles(e.target.files)}
            />
            <input
              ref={cameraInputRef}
              className="hidden"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => addFiles(e.target.files)}
            />

            <div
              className="rounded-2xl border-2 border-dashed border-cyan-300/70 bg-cyan-50/50 p-6 transition hover:bg-cyan-50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <UploadCloud className="text-cyan-600" size={30} />
                <p className="mt-2 text-sm font-semibold text-slate-800">Arrastra archivos aquí o selecciónalos manualmente</p>
                <p className="mt-1 text-xs text-slate-500">En móvil puedes tomar fotos directas con cámara o subir PDF/imagenes.</p>
                <div className="mt-4 flex w-full flex-col items-center gap-2 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300 bg-white px-4 py-2.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 sm:w-auto"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera size={16} />
                    Tomar foto
                  </button>
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300 bg-white px-4 py-2.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 sm:w-auto"
                    onClick={() => inputRef.current?.click()}
                  >
                    <FolderUp size={16} />
                    Seleccionar archivos
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
              <FileText size={14} />
              <span>{files.length} archivo(s) seleccionado(s)</span>
              <span>·</span>
              <span>{totalSizeMb.toFixed(2)} MB</span>
            </div>

            {files.length > 0 && (
              <div className="mt-3 grid gap-2">
                {files.map((file) => (
                  <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                      onClick={() => removeFile(file)}
                      aria-label={`Quitar ${file.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

          <button className="bank-btn w-fit" type="submit" disabled={loading}>
            {loading ? "Subiendo documentos..." : "Guardar operación"}
          </button>
        </form>
      </article>

      {result && (
        <article className="bank-card reveal border-cyan-200 bg-cyan-50/70 p-6 text-sm" style={{ animationDelay: "130ms" }}>
          <p className="font-semibold text-slate-900">Operación creada: {result.operationId}</p>
          <p className="mt-1 text-xs text-slate-600">La extracción IA quedó corriendo en segundo plano.</p>
          <ul className="mt-3 space-y-2 text-slate-800">
            {result.documents.map((doc) => (
              <li key={doc.fileName} className="rounded-lg bg-white p-3">
                <span className="font-semibold">{doc.fileName}:</span> {JSON.stringify(doc.fields)}
              </li>
            ))}
          </ul>
        </article>
      )}
    </section>
  );
}
