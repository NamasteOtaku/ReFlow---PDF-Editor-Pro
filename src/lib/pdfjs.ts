// Centralized pdf.js loader with worker setup (browser only).
import * as pdfjsLib from "pdfjs-dist";

if (typeof window !== "undefined") {
  // Fix: Bypassing Vite's worker bundling issues by loading directly from CDN
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export { pdfjsLib };
