declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(input: { data: Uint8Array }): { promise: Promise<any> };
}
