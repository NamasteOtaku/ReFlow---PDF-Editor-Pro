import { useEffect, useRef, useState } from "react";
import { pdfjsLib } from "@/lib/pdfjs";
import { usePdfStore, type OcrPage } from "@/lib/pdf-store";
import { ocrPage } from "@/lib/ocr";

type TextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
};

type RenderedPage = {
  pageIndex: number;
  width: number;
  height: number;
  canvasUrl: string;
  items: TextItem[];
  viewportTransform: number[];
  hasNativeText: boolean;
};

const RENDER_SCALE = 1.4;

export function PdfCanvas() {
  const arrayBuffer = usePdfStore((s) => s.arrayBuffer);
  const edits = usePdfStore((s) => s.edits);
  const setEdit = usePdfStore((s) => s.setEdit);
  const ocrByPage = usePdfStore((s) => s.ocrByPage);
  const setOcrPage = usePdfStore((s) => s.setOcrPage);
  const setStatus = usePdfStore((s) => s.setStatus);
  const ocrLanguage = usePdfStore((s) => s.ocrLanguage);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const renderToken = useRef(0);

  useEffect(() => {
    if (!arrayBuffer) {
      setPages([]);
      return;
    }
    const token = ++renderToken.current;
    setStatus({ phase: "loading", message: "Parsing PDF…" });
    (async () => {
      const buf = arrayBuffer.slice(0);
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const rendered: RenderedPage[] = [];
      const ocrTargets: { pageIndex: number; page: import("pdfjs-dist").PDFPageProxy }[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const textContent = await page.getTextContent();
        const items = textContent.items as unknown as TextItem[];
        const totalText = items.reduce((n, it) => n + (it.str?.trim().length ?? 0), 0);
        const hasNativeText = totalText > 20; // heuristic: scanned pages have ~0
        rendered.push({
          pageIndex: i - 1,
          width: viewport.width,
          height: viewport.height,
          canvasUrl: canvas.toDataURL(),
          items,
          viewportTransform: viewport.transform,
          hasNativeText,
        });
        if (!hasNativeText) ocrTargets.push({ pageIndex: i - 1, page });
        if (token !== renderToken.current) return;
      }
      if (token !== renderToken.current) return;
      setPages(rendered);

      // Run OCR for image-only pages
      if (ocrTargets.length === 0) {
        setStatus({ phase: "ready" });
        return;
      }
      for (let k = 0; k < ocrTargets.length; k++) {
        const { pageIndex, page } = ocrTargets[k];
        setStatus({
          phase: "ocr",
          pageIndex,
          totalPages: ocrTargets.length,
          progress: 0,
        });
        try {
          const result = await ocrPage({
            page,
            pageIndex,
            renderScale: RENDER_SCALE,
            language: ocrLanguage,
            onProgress: (p) =>
              setStatus({
                phase: "ocr",
                pageIndex,
                totalPages: ocrTargets.length,
                progress: p,
              }),
          });
          if (token !== renderToken.current) return;
          setOcrPage(result);
        } catch (e) {
          console.error("OCR failed for page", pageIndex, e);
        }
      }
      if (token !== renderToken.current) return;
      setStatus({ phase: "ready" });
    })().catch((e) => {
      console.error(e);
      setStatus({ phase: "error", message: e?.message ?? "Failed to parse" });
    });
  }, [arrayBuffer, setOcrPage, setStatus, ocrLanguage]);

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {pages.map((page) => {
        const ocr: OcrPage | undefined = ocrByPage[page.pageIndex];
        return (
          <div
            key={page.pageIndex}
            className="relative rounded-md bg-white shadow-soft ring-1 ring-border"
            style={{ width: page.width, height: page.height }}
          >
            <img
              src={page.canvasUrl}
              alt={`Page ${page.pageIndex + 1}`}
              className="absolute inset-0 h-full w-full select-none"
              draggable={false}
            />
            {page.hasNativeText &&
              page.items.map((item, idx) => {
                if (!item.str || !item.str.trim()) return null;
                const [a, b, , , e, f] = item.transform;
                const [va, vb, vc, vd, ve, vf] = page.viewportTransform;
                const x = va * e + vc * f + ve;
                const y = vb * e + vd * f + vf;
                const fontSize = Math.hypot(a * va + b * vc, a * vb + b * vd);
                const top = y - fontSize;
                const key = `${page.pageIndex}-${idx}`;
                const edit = edits[key];
                const value = edit?.newText ?? item.str;
                return (
                  <EditableSpan
                    key={key}
                    left={x}
                    top={top}
                    width={item.width * Math.abs(va)}
                    height={fontSize * 1.2}
                    fontSize={fontSize}
                    value={value}
                    edited={edit ? edit.newText !== edit.originalText : false}
                    onChange={(v) =>
                      setEdit(key, {
                        pageIndex: page.pageIndex,
                        itemIndex: idx,
                        originalText: item.str,
                        newText: v,
                      })
                    }
                  />
                );
              })}
            {!page.hasNativeText &&
              ocr?.words.map((w, idx) => {
                const key = `ocr-${page.pageIndex}-${idx}`;
                const edit = edits[key];
                const value = edit?.newText ?? w.text;
                return (
                  <EditableSpan
                    key={key}
                    left={w.left}
                    top={w.top}
                    width={w.width}
                    height={w.height}
                    fontSize={w.fontSize}
                    value={value}
                    edited={edit ? edit.newText !== edit.originalText : false}
                    onChange={(v) =>
                      setEdit(key, {
                        pageIndex: page.pageIndex,
                        itemIndex: idx,
                        originalText: w.text,
                        newText: v,
                      })
                    }
                  />
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

function EditableSpan({
  left,
  top,
  width,
  height,
  fontSize,
  value,
  edited,
  onChange,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  value: string;
  edited: boolean;
  onChange: (v: string) => void;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
HEAD
  const hasCommitted = useRef(false);

 5c5faf24297896dcf172553ab0e829bfb3711c86

  // Keep DOM text in sync with prop value whenever it changes from outside
  // (e.g. store update after commit). Without this, contentEditable retains
  // the old DOM children and the visible text does not refresh.
  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    if (el.textContent !== value) {
      el.textContent = value;
    }
  }, [value]);

HEAD
  const commit = (text: string) => {
    if (text !== value) onChange(text);
  };

  const isEdited = hasCommitted.current || edited;


  const commit = () => {
    const el = spanRef.current;
    if (!el) return;
    const v = el.textContent ?? "";
    if (v !== value) onChange(v);
  };

 5c5faf24297896dcf172553ab0e829bfb3711c86
  return (
    <span
      ref={spanRef}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
HEAD
      onBlur={(e) => {
        const text = (e.currentTarget as HTMLSpanElement).textContent ?? "";
        hasCommitted.current = true;
        commit(text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const el = e.currentTarget as HTMLSpanElement;
          const text = el.textContent ?? "";
          hasCommitted.current = true;
          commit(text);
          el.blur();

      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          (e.currentTarget as HTMLSpanElement).blur();
 5c5faf24297896dcf172553ab0e829bfb3711c86
        }
      }}
      className={
        "absolute cursor-text whitespace-pre rounded-sm px-0.5 leading-none caret-foreground outline-none transition hover:bg-accent/60 hover:text-foreground focus:bg-accent focus:text-foreground focus:ring-2 focus:ring-primary/60 " +
HEAD
        (isEdited

        (edited
 5c5faf24297896dcf172553ab0e829bfb3711c86
          ? "bg-white text-foreground"
          : "bg-white/0 text-transparent")
      }
      style={{
        left,
        top,
        minWidth: width,
        height,
        fontSize,
        fontFamily: "sans-serif",
      }}
    >
      {value}
    </span>
  );
}
