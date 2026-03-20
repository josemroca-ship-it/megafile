import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DocumentViewerPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    select: { id: true, fileName: true, mimeType: true }
  });

  if (!document) notFound();

  const src = `/api/documents/${document.id}`;
  const isImage = document.mimeType.startsWith("image/");
  const isPdf = document.mimeType === "application/pdf";

  return (
    <section className="space-y-4">
      <article className="bank-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Documento</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900 md:text-lg">{document.fileName}</h2>
            <p className="text-xs text-slate-500">{document.mimeType}</p>
          </div>
          <Link className="bank-btn-secondary text-sm" href={src} target="_blank" rel="noreferrer">
            Abrir archivo original
          </Link>
        </div>
      </article>

      <article className="bank-card overflow-hidden p-0">
        {isPdf ? (
          <iframe className="h-[78vh] w-full" src={src} title={document.fileName} />
        ) : isImage ? (
          <div className="flex min-h-[72vh] items-center justify-center bg-slate-100 p-4">
            <img
              src={src}
              alt={document.fileName}
              className="max-h-[72vh] w-auto max-w-full rounded-lg bg-white shadow"
              style={{ imageOrientation: "from-image" as any }}
            />
          </div>
        ) : (
          <div className="p-6 text-sm text-slate-600">
            Este formato no tiene vista embebida. Usa &quot;Abrir archivo original&quot;.
          </div>
        )}
      </article>
    </section>
  );
}
