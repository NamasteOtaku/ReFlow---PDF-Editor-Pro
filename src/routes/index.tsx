import { FileText, Download, RotateCcw, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePdfStore } from "@/lib/pdf-store";
import { Dropzone } from "@/components/Dropzone";
import { PdfCanvas } from "@/components/PdfCanvas";
HEAD
import { AdSlot } from "@/components/AdSlot";
import { AdblockModal } from "@/components/AdblockModal";
import { useAdblockDetect } from "@/hooks/useAdblockDetect";

5c5faf24297896dcf172553ab0e829bfb3711c86
import { exportEditedPdf, downloadBytes } from "@/lib/pdf-export";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Reflow — Edit PDFs Word by Word" },
      {
        name: "description",
        content:
          "A minimalist in-browser PDF editor. Drop a PDF and edit text directly on the page.",
      },
    ],
  }),
});

function Index() {
  const {
    file,
    fileName,
    arrayBuffer,
    edits,
    reset,
    ocrByPage,
    status,
    ocrLanguage,
    setOcrLanguage,
  } = usePdfStore();
  const [exporting, setExporting] = useState(false);
HEAD
  const { isAdblockEnabled } = useAdblockDetect();

  if (isAdblockEnabled) {
    return <AdblockModal />;
  }

5c5faf24297896dcf172553ab0e829bfb3711c86

  const handleExport = async () => {
    if (!arrayBuffer || !fileName) return;
    setExporting(true);
    try {
      const bytes = await exportEditedPdf(arrayBuffer, edits, ocrByPage);
      downloadBytes(bytes, fileName.replace(/\.pdf$/i, "") + "-edited.pdf");
    } finally {
      setExporting(false);
    }
  };

  const editCount = Object.values(edits).filter(
    (e) => e.newText !== e.originalText,
  ).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold tracking-tight">Reflow</span>
              <span className="text-xs text-muted-foreground">PDF editor</span>
            </div>
          </div>
          {file && (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {editCount > 0
                  ? `${editCount} edit${editCount === 1 ? "" : "s"}`
                  : "No edits yet"}
              </span>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                New file
              </Button>
              <Button size="sm" onClick={handleExport} disabled={exporting}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {exporting ? "Exporting…" : "Export PDF"}
              </Button>
            </div>
          )}
        </div>
      </header>

      <main>
        {!file ? (
          <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-20">
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              In-browser, no upload to servers
            </span>
            <h1 className="text-balance text-center text-5xl font-semibold tracking-tight md:text-6xl">
              Edit PDFs like a{" "}
              <span className="text-primary">document</span>, not an image.
            </h1>
            <p className="mt-5 max-w-xl text-center text-base text-muted-foreground">
              Drop a PDF and edit text directly on the page. Reflow parses the
              layout so you can change words, fix typos, and export — all in
              your browser.
            </p>
            <div className="mt-12 w-full">
              <Dropzone />
            </div>
            <ul className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <li className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                <MousePointerClick className="h-4 w-4 text-primary" /> Click to edit
              </li>
              <li className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                <FileText className="h-4 w-4 text-primary" /> Layout-aware
              </li>
              <li className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                <Download className="h-4 w-4 text-primary" /> Export to PDF
              </li>
            </ul>
          </section>
        ) : (
          <section className="bg-surface-muted">
            <div className="mx-auto max-w-7xl px-6">
              <div className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm text-muted-foreground">
                <span className="truncate">{fileName}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs">
                    OCR language
                    <select
                      value={ocrLanguage}
                      onChange={(e) => setOcrLanguage(e.target.value)}
                      className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
                    >
                      <option value="eng">English</option>
                      <option value="spa">Spanish</option>
                      <option value="fra">French</option>
                      <option value="deu">German</option>
                      <option value="ita">Italian</option>
                      <option value="por">Portuguese</option>
                      <option value="nld">Dutch</option>
                      <option value="rus">Russian</option>
                      <option value="chi_sim">Chinese (Simplified)</option>
                      <option value="jpn">Japanese</option>
                      <option value="kor">Korean</option>
                      <option value="ara">Arabic</option>
                      <option value="hin">Hindi</option>
                    </select>
                  </label>
                  <span className="hidden sm:inline">
                    Click any word to edit.
                  </span>
                </div>
              </div>
              {status.phase === "loading" && (
                <div className="mb-4 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                  {status.message}
                </div>
              )}
              {status.phase === "ocr" && (
                <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      Running OCR on page {status.pageIndex + 1} of{" "}
                      {status.totalPages}…
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(status.progress * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.round(status.progress * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {status.phase === "error" && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {status.message}
                </div>
              )}
HEAD
              <div className="flex flex-row gap-4">
                <div className="min-w-0 flex-1">
                  <PdfCanvas />
                </div>
                <aside className="sticky top-4 hidden w-[300px] shrink-0 self-start lg:block">
                  <AdSlot placement="sidebar" />
                </aside>
              </div>

              <PdfCanvas />
5c5faf24297896dcf172553ab0e829bfb3711c86
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
