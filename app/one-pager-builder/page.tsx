"use client";

import Image from "next/image";
import { ChangeEvent, useMemo, useState } from "react";
import { Download, Globe, ImagePlus, Link as LinkIcon } from "lucide-react";

const PRESET_MOCKUPS = [
  { id: "dashboard", name: "Dashboard Mockup", src: "/alt-hero-dashboard.svg" },
  { id: "placeholder", name: "Document Thumbnail Mockup", src: "/pdf-placeholder.svg" }
];

const benefits = [
  "Cuts manual document handling and search time across operations.",
  "Turns unstructured files into searchable, AI-assisted knowledge.",
  "Improves traceability for clients, operations, and supporting evidence.",
  "Strengthens governance with role-based access and document security controls.",
  "Accelerates analyst response for audits, compliance, and internal requests."
];

const capabilities = [
  "Smart Capture: PDF/image ingestion from desktop and mobile camera.",
  "AI Extraction: Key fields and summaries extracted for document intelligence.",
  "Conversational Search: Prompt-based retrieval with snippet evidence.",
  "Reports & Exports: AI-generated analytics with CSV/PDF outputs.",
  "Role-Based Security: Access policies by user role and document type."
];

export default function OnePagerBuilderPage() {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_MOCKUPS[0].id);
  const [customUrl, setCustomUrl] = useState("");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [localName, setLocalName] = useState<string>("");

  const selectedPresetSrc = useMemo(
    () => PRESET_MOCKUPS.find((item) => item.id === selectedPreset)?.src ?? PRESET_MOCKUPS[0].src,
    [selectedPreset]
  );

  const finalMockupSrc = localPreview || customUrl.trim() || selectedPresetSrc;

  function onUploadMockup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setLocalName(file.name);
  }

  function clearCustomMockup() {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    setLocalName("");
    setCustomUrl("");
  }

  function exportPdf() {
    window.print();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-8 print:max-w-none print:px-0 print:py-0">
      <style>{`
        @media print {
          body { background: white !important; }
          .print-hidden { display: none !important; }
          .print-sheet {
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      <section className="print-hidden mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-slate-900">One-Pager PDF Builder</h1>
            <p className="mt-1 text-sm text-slate-600">Select the mockup image and export the document as PDF.</p>
          </div>
          <button
            type="button"
            onClick={exportPdf}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            <Download size={16} />
            Export to PDF
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Preset Mockups</p>
            <div className="space-y-2">
              {PRESET_MOCKUPS.map((preset) => (
                <label key={preset.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="presetMockup"
                    checked={selectedPreset === preset.id}
                    onChange={() => setSelectedPreset(preset.id)}
                  />
                  {preset.name}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <LinkIcon size={12} />
              External URL
            </p>
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <ImagePlus size={12} />
              Local file
            </p>
            <input type="file" accept="image/*" onChange={onUploadMockup} className="w-full text-xs text-slate-600" />
            {localName ? <p className="mt-2 text-xs text-slate-500">Loaded: {localName}</p> : null}
            {(localName || customUrl) && (
              <button type="button" onClick={clearCustomMockup} className="mt-2 text-xs font-semibold text-cyan-700">
                Reset custom mockup
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="print-sheet overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[#0b1f3a] px-6 py-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <Image src="/megafy-logo.png" alt="Megafy" width={148} height={48} className="h-10 w-auto rounded-sm bg-[#0b2d56] p-1.5" />
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/40 bg-cyan-200/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100">
              <Globe size={12} />
              Megafyle by Megafy
            </div>
          </div>
          <h2 className="mt-4 font-display text-3xl leading-tight">Megafyle: AI-powered document intelligence platform</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-200">
            Megafyle orchestrates document capture, AI extraction, conversational search, and operational reporting in one secure workspace.
          </p>
        </div>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-[1.05fr_0.95fr]">
          <article>
            <h3 className="text-lg font-semibold text-slate-900">Main Benefits</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {benefits.map((item) => (
                <li key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article>
            <h3 className="text-lg font-semibold text-slate-900">Core Capabilities</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {capabilities.map((item) => (
                <li key={item} className="rounded-lg border border-cyan-100 bg-cyan-50/40 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="border-t border-slate-200 px-6 py-6">
          <p className="mb-3 text-sm font-semibold text-slate-800">Selected Mockup</p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={finalMockupSrc} alt="Selected mockup" className="h-auto w-full rounded-lg object-cover" />
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-3 text-xs text-slate-500">
          Product: Megafyle · Developed by Megafy · www.megafy.net
        </div>
      </section>
    </main>
  );
}
