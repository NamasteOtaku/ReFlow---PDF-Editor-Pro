import { create } from "zustand";

export type TextEdit = {
  pageIndex: number;
  itemIndex: number;
  originalText: string;
  newText: string;
};

// OCR word with bounding box in CSS pixels (matching the rendered page size).
export type OcrWord = {
  text: string;
  // Bounding box in the rendered page coordinate space (same as PdfCanvas page width/height)
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
};

export type OcrPage = {
  pageIndex: number;
  // Rendered page dimensions used as the coordinate space for `words`
  renderWidth: number;
  renderHeight: number;
  // Original PDF page size (points) — used to map back when exporting
  pdfWidth: number;
  pdfHeight: number;
  words: OcrWord[];
};

export type IngestStatus =
  | { phase: "idle" }
  | { phase: "loading"; message: string }
  | { phase: "ocr"; pageIndex: number; totalPages: number; progress: number }
  | { phase: "ready" }
  | { phase: "error"; message: string };

type PdfState = {
  file: File | null;
  fileName: string | null;
  arrayBuffer: ArrayBuffer | null;
  edits: Record<string, TextEdit>;
  ocrByPage: Record<number, OcrPage>;
  ocrLanguage: string;
  status: IngestStatus;
  setFile: (file: File, buf: ArrayBuffer) => void;
  reset: () => void;
  setEdit: (key: string, edit: TextEdit) => void;
  setOcrPage: (page: OcrPage) => void;
  setStatus: (s: IngestStatus) => void;
  setOcrLanguage: (lang: string) => void;
};

export const usePdfStore = create<PdfState>((set) => ({
  file: null,
  fileName: null,
  arrayBuffer: null,
  edits: {},
  ocrByPage: {},
  ocrLanguage: "eng",
  status: { phase: "idle" },
  setFile: (file, buf) =>
    set({
      file,
      fileName: file.name,
      arrayBuffer: buf,
      edits: {},
      ocrByPage: {},
      status: { phase: "loading", message: "Parsing PDF…" },
    }),
  reset: () =>
    set({
      file: null,
      fileName: null,
      arrayBuffer: null,
      edits: {},
      ocrByPage: {},
      status: { phase: "idle" },
    }),
  setEdit: (key, edit) =>
    set((s) => ({ edits: { ...s.edits, [key]: edit } })),
  setOcrPage: (page) =>
    set((s) => ({ ocrByPage: { ...s.ocrByPage, [page.pageIndex]: page } })),
  setStatus: (status) => set({ status }),
  setOcrLanguage: (ocrLanguage) => set({ ocrLanguage }),
}));
