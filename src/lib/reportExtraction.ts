// Client-side extraction of real report content before analysis.
// Supports PDF (text + scanned pages rendered to images), images,
// DOCX, TXT and CSV. Enforces page and payload budgets so the request
// stays within the backend's ~3.5 MB limit.

import * as pdfjs from "pdfjs-dist";
import mammoth from "mammoth";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PAGES = 8;
export const MAX_IMAGES = 4;
const MAX_PAYLOAD_BYTES = 3_400_000;
const MAX_IMAGE_DIMENSION = 1600;
const MIN_MEANINGFUL_TEXT_PER_PAGE = 20;

export interface ExtractedReport {
  fileName: string;
  fileType: string;
  pages: { page: number; text: string }[];
  images: { page: number | null; dataUrl: string }[];
  truncated: boolean;
  totalPages: number;
}

export class ExtractionError extends Error {}

export const ACCEPTED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp,.docx,.txt,.csv";

function extOf(name: string): string {
  return name.slice(name.lastIndexOf(".") + 1).toLowerCase();
}

function estimatePayloadSize(report: ExtractedReport): number {
  const textBytes = report.pages.reduce((n, p) => n + p.text.length, 0);
  const imageBytes = report.images.reduce((n, i) => n + i.dataUrl.length, 0);
  return textBytes + imageBytes + 2048;
}

async function fileToResizedDataUrl(file: File | Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ExtractionError("Could not process this image in your browser.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  if (!dataUrl.startsWith("data:image/jpeg")) {
    throw new ExtractionError("Could not process this image in your browser.");
  }
  return dataUrl;
}

async function extractPdf(file: File): Promise<ExtractedReport> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  let doc;
  try {
    doc = await loadingTask.promise;
  } catch {
    throw new ExtractionError("This PDF could not be opened. It may be corrupted or password-protected.");
  }
  try {
    return await readPdf(file, doc);
  } finally {
    try { await loadingTask.destroy(); } catch { /* ignore cleanup errors */ }
  }
}

async function readPdf(file: File, doc: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>): Promise<ExtractedReport> {

  const totalPages = doc.numPages;
  const pagesToRead = Math.min(totalPages, MAX_PAGES);
  const truncated = totalPages > MAX_PAGES;
  const pages: { page: number; text: string }[] = [];
  const images: { page: number | null; dataUrl: string }[] = [];

  for (let i = 1; i <= pagesToRead; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length >= MIN_MEANINGFUL_TEXT_PER_PAGE) {
      pages.push({ page: i, text });
    }
  }

  // Scanned PDF: little or no extractable text — render pages to images.
  if (pages.length === 0) {
    const pagesToRender = Math.min(totalPages, MAX_IMAGES);
    for (let i = 1; i <= pagesToRender; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(2, MAX_IMAGE_DIMENSION / Math.max(viewport.width, viewport.height));
      const scaled = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(scaled.width);
      canvas.height = Math.round(scaled.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new ExtractionError("Could not render this PDF in your browser.");
      await page.render({ canvasContext: ctx, viewport: scaled }).promise;
      images.push({ page: i, dataUrl: canvas.toDataURL("image/jpeg", 0.85) });
    }
    if (images.length === 0) {
      throw new ExtractionError("No readable content was found in this PDF.");
    }
  }

  return { fileName: file.name, fileType: "pdf", pages, images, truncated, totalPages };
}

async function extractDocx(file: File): Promise<ExtractedReport> {
  const buffer = await file.arrayBuffer();
  let text: string;
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    text = result.value.replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    throw new ExtractionError("This DOCX file could not be read. It may be corrupted.");
  }
  if (!text) throw new ExtractionError("No readable text was found in this document.");
  return { fileName: file.name, fileType: "docx", pages: [{ page: 1, text }], images: [], truncated: false, totalPages: 1 };
}

async function extractPlainText(file: File, kind: string): Promise<ExtractedReport> {
  const text = (await file.text()).trim();
  if (!text) throw new ExtractionError("This file appears to be empty.");
  return { fileName: file.name, fileType: kind, pages: [{ page: 1, text }], images: [], truncated: false, totalPages: 1 };
}

export async function extractReport(file: File): Promise<ExtractedReport> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ExtractionError("This file is larger than 10 MB. Please upload a smaller report.");
  }
  const ext = extOf(file.name);
  let report: ExtractedReport;

  if (ext === "pdf" || file.type === "application/pdf") {
    report = await extractPdf(file);
  } else if (["jpg", "jpeg", "png", "webp"].includes(ext) || file.type.startsWith("image/")) {
    const dataUrl = await fileToResizedDataUrl(file);
    report = { fileName: file.name, fileType: ext, pages: [], images: [{ page: null, dataUrl }], truncated: false, totalPages: 1 };
  } else if (ext === "docx") {
    report = await extractDocx(file);
  } else if (ext === "txt" || ext === "csv") {
    report = await extractPlainText(file, ext);
  } else {
    throw new ExtractionError("This file format is not supported. Please upload a PDF, JPG, PNG, WebP, DOCX, TXT, or CSV file.");
  }

  if (estimatePayloadSize(report) > MAX_PAYLOAD_BYTES) {
    throw new ExtractionError(
      "This report is too large to analyze in one request. Please upload fewer pages or split the document.",
    );
  }
  return report;
}
