import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { TextEdit, OcrPage } from "@/lib/pdf-store";

// Exporter: covers edited words with a white rectangle and writes the new text
// at the original position. Supports both native-text edits (key: "page-idx")
// and OCR-derived edits (key: "ocr-page-idx") via stored OcrPage geometry.
export async function exportEditedPdf(
  arrayBuffer: ArrayBuffer,
  edits: Record<string, TextEdit>,
  ocrByPage: Record<number, OcrPage>,
): Promise<Uint8Array> {
  const { pdfjsLib } = await import("@/lib/pdfjs");
  const buf = arrayBuffer.slice(0);
  const srcDoc = await PDFDocument.load(buf);
  const font = await srcDoc.embedFont(StandardFonts.Helvetica);

  const parseBuf = arrayBuffer.slice(0);
  const pdf = await pdfjsLib.getDocument({ data: parseBuf }).promise;

  type Bucket = { native: TextEdit[]; ocr: TextEdit[] };
  const byPage = new Map<number, Bucket>();
  for (const key of Object.keys(edits)) {
    const e = edits[key];
    if (e.newText === e.originalText) continue;
    if (!byPage.has(e.pageIndex)) byPage.set(e.pageIndex, { native: [], ocr: [] });
    const isOcr = key.startsWith("ocr-");
    byPage.get(e.pageIndex)![isOcr ? "ocr" : "native"].push(e);
  }

  for (const [pageIndex, bucket] of byPage) {
    const srcPage = srcDoc.getPage(pageIndex);

    // Native-text edits via pdf.js item geometry
    if (bucket.native.length) {
      const page = await pdf.getPage(pageIndex + 1);
      const tc = await page.getTextContent();
      const items = tc.items as Array<{
        str: string;
        transform: number[];
        width: number;
      }>;
      for (const edit of bucket.native) {
        const item = items[edit.itemIndex];
        if (!item) continue;
        const [a, b, , , e, f] = item.transform;
        const fontSize = Math.hypot(a, b);
        srcPage.drawRectangle({
          x: e - 1,
          y: f - 2,
          width: item.width + 2,
          height: fontSize + 4,
          color: rgb(1, 1, 1),
        });
        srcPage.drawText(edit.newText, {
          x: e,
          y: f,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }

    // OCR edits via stored OcrPage geometry
    if (bucket.ocr.length) {
      const ocr = ocrByPage[pageIndex];
      if (!ocr) continue;
      const sx = ocr.pdfWidth / ocr.renderWidth;
      const sy = ocr.pdfHeight / ocr.renderHeight;
      for (const edit of bucket.ocr) {
        const w = ocr.words[edit.itemIndex];
        if (!w) continue;
        const x = w.left * sx;
        const widthPdf = w.width * sx;
        const heightPdf = w.height * sy;
        // PDF origin is bottom-left
        const y = ocr.pdfHeight - (w.top + w.height) * sy;
        const fontSize = heightPdf * 0.85;
        srcPage.drawRectangle({
          x: x - 1,
          y: y - 2,
          width: widthPdf + 2,
          height: heightPdf + 4,
          color: rgb(1, 1, 1),
        });
        srcPage.drawText(edit.newText, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }
  }

  return await srcDoc.save();
}

export function downloadBytes(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
