// OCR pipeline using tesseract.js. Browser-only.
import type { OcrPage, OcrWord } from "@/lib/pdf-store";

// Render a PDF page to a canvas at the given scale, with brightness/contrast
// normalization applied. We aim for >= 300 DPI: PDF base is 72 DPI, so scale
// >= ~4.17 reaches 300 DPI.
export async function renderPageForOcr(
  page: import("pdfjs-dist").PDFPageProxy,
HEAD
  targetDpi = 600,
): Promise<{ canvas: HTMLCanvasElement; scale: number }> {
  // PDF base is 72 DPI. Force at least the requested DPI (default 600) and

  targetDpi = 300,
): Promise<{ canvas: HTMLCanvasElement; scale: number }> {
  // PDF base is 72 DPI. Force at least the requested DPI (default 300) and
5c5faf24297896dcf172553ab0e829bfb3711c86
  // never go below 4x to give noisy / AI-generated pages enough pixel density.
  const scale = Math.max(4, targetDpi / 72);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  // White background to help OCR on transparent PDFs
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  normalizeContrast(ctx, canvas.width, canvas.height);
  binarize(ctx, canvas.width, canvas.height);
  return { canvas, scale };
}

// Grayscale + adaptive (Otsu) binarization. Produces pure black/white pixels
// which dramatically improves Tesseract accuracy on AI-generated / noisy
// images with soft edges and gradient backgrounds.
function binarize(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const hist = new Uint32Array(256);
  const lum = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const y = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    const yi = Math.min(255, Math.max(0, y | 0));
    lum[j] = yi;
    hist[yi]++;
  }
  // Otsu's method to find optimal threshold
  const total = w * h;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  for (let j = 0, i = 0; j < lum.length; j++, i += 4) {
    const v = lum[j] < threshold ? 0 : 255;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}


// Simple brightness/contrast normalization: stretch luminance histogram and
// boost contrast. This improves OCR accuracy on faded or low-contrast scans.
function normalizeContrast(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // Find 2nd/98th percentile luminance for histogram stretching
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const y = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    hist[Math.min(255, Math.max(0, y | 0))]++;
  }
  const total = (d.length / 4) | 0;
  const lowCut = total * 0.02;
  const highCut = total * 0.02;
  let lo = 0;
  let hi = 255;
  let acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= lowCut) {
      lo = i;
      break;
    }
  }
  acc = 0;
  for (let i = 255; i >= 0; i--) {
    acc += hist[i];
    if (acc >= highCut) {
      hi = i;
      break;
    }
  }
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = d[i + c];
      const stretched = ((v - lo) * 255) / range;
      d[i + c] = Math.min(255, Math.max(0, stretched));
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Detect skew by sampling text-row angles. Returns degrees in [-15, 15].
// Lightweight heuristic: project horizontal sums for several rotations and
// pick the angle with sharpest peaks (highest variance).
export function estimateSkew(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d")!;
  const scale = 0.25;
  const w = Math.max(1, (canvas.width * scale) | 0);
  const h = Math.max(1, (canvas.height * scale) | 0);
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d")!;
  tctx.drawImage(canvas, 0, 0, w, h);
  const data = tctx.getImageData(0, 0, w, h).data;

  let bestAngle = 0;
  let bestScore = -Infinity;
  for (let deg = -10; deg <= 10; deg += 1) {
    const rad = (deg * Math.PI) / 180;
    const sin = Math.sin(rad);
    const rowSums = new Float32Array(h);
    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let x = 0; x < w; x += 2) {
        const sy = Math.min(h - 1, Math.max(0, (y + x * sin) | 0));
        const idx = (sy * w + x) * 4;
        // Inverted luminance (text = high)
        const lum = 255 - (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        sum += lum;
      }
      rowSums[y] = sum;
    }
    let mean = 0;
    for (let y = 0; y < h; y++) mean += rowSums[y];
    mean /= h;
    let variance = 0;
    for (let y = 0; y < h; y++) {
      const d = rowSums[y] - mean;
      variance += d * d;
    }
    if (variance > bestScore) {
      bestScore = variance;
      bestAngle = deg;
    }
  }
  return bestAngle;
}

// Rotate a canvas by the given degrees, returning a new canvas.
export function rotateCanvas(
  src: HTMLCanvasElement,
  deg: number,
): HTMLCanvasElement {
  if (Math.abs(deg) < 0.5) return src;
  const rad = (deg * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const w = src.width;
  const h = src.height;
  const nw = Math.ceil(w * cos + h * sin);
  const nh = Math.ceil(w * sin + h * cos);
  const out = document.createElement("canvas");
  out.width = nw;
  out.height = nh;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, nw, nh);
  ctx.translate(nw / 2, nh / 2);
  ctx.rotate(rad);
  ctx.drawImage(src, -w / 2, -h / 2);
  return out;
}

export async function ocrPage(opts: {
  page: import("pdfjs-dist").PDFPageProxy;
  pageIndex: number;
  renderScale: number; // scale used in the on-screen render
  language: string;
  onProgress?: (p: number) => void;
}): Promise<OcrPage> {
  const { page, pageIndex, renderScale, language, onProgress } = opts;
  const pdfViewport = page.getViewport({ scale: 1 });
  const renderViewport = page.getViewport({ scale: renderScale });

  // Render at high DPI for OCR
HEAD
  const { canvas: hiCanvas, scale: ocrScale } = await renderPageForOcr(page, 600);

  const { canvas: hiCanvas, scale: ocrScale } = await renderPageForOcr(page, 300);
5c5faf24297896dcf172553ab0e829bfb3711c86
  // Deskew
  const skew = estimateSkew(hiCanvas);
  const deskewed = rotateCanvas(hiCanvas, -skew);

  const { default: Tesseract } = await import("tesseract.js");
HEAD
  const recognizeConfig = {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
    },
    // PSM 11: sparse text — best for AI-generated layouts with scattered text
    tessedit_pageseg_mode: "11",
  } as unknown as Parameters<typeof Tesseract.recognize>[2];
  const result = await Tesseract.recognize(deskewed, language, recognizeConfig);

  const result = await Tesseract.recognize(deskewed, language, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
    },
  });
5c5faf24297896dcf172553ab0e829bfb3711c86

  // Map word bboxes from the deskewed-hi-DPI canvas back to render coords.
  // For accuracy we map via the un-rotated hi-DPI canvas: tesseract bboxes are
  // in deskewed coords. Apply inverse rotation around the deskewed center,
  // then offset to the original hi-DPI canvas, then scale to render coords.
  const rad = (-(-skew) * Math.PI) / 180; // inverse rotation
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  const dW = deskewed.width;
  const dH = deskewed.height;
  const hW = hiCanvas.width;
  const hH = hiCanvas.height;

  const words: OcrWord[] = [];
  // Newer tesseract.js may not expose `words` by default; fall back to lines.
  type TWord = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } };
  const rawWords: TWord[] =
    (result.data as unknown as { words?: TWord[] }).words ?? [];
  const scaleToRender = renderScale / ocrScale; // hi-DPI px → render px

  for (const w of rawWords) {
    const text = w.text?.trim();
    if (!text) continue;
    const { x0, y0, x1, y1 } = w.bbox;
    // 4 corners in deskewed space → rotate back to hi-DPI space
    const corners = [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ].map(([x, y]) => {
      const cx = x - dW / 2;
      const cy = y - dH / 2;
      return [cx * cos - cy * sin + hW / 2, cx * sin + cy * cos + hH / 2];
    });
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const left = minX * scaleToRender;
    const top = minY * scaleToRender;
    const width = (maxX - minX) * scaleToRender;
    const height = (maxY - minY) * scaleToRender;
    words.push({
      text,
      left,
      top,
      width,
      height,
      fontSize: height * 0.85,
    });
  }

  return {
    pageIndex,
    renderWidth: renderViewport.width,
    renderHeight: renderViewport.height,
    pdfWidth: pdfViewport.width,
    pdfHeight: pdfViewport.height,
    words,
  };
}
