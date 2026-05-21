import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";
import { usePdfStore } from "@/lib/pdf-store";

export function Dropzone() {
  const setFile = usePdfStore((s) => s.setFile);

  const onDrop = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      const buf = await f.arrayBuffer();
      setFile(f, buf);
    },
    [setFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`group relative flex w-full max-w-2xl cursor-pointer flex-col items-center justify-center gap-5 rounded-xl border-2 border-dashed bg-card px-10 py-20 text-center transition ${
        isDragActive
          ? "border-primary bg-accent"
          : "border-border hover:border-primary/60 hover:bg-surface"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground transition group-hover:scale-105">
        <Upload className="h-6 w-6" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-medium tracking-tight text-foreground">
          {isDragActive ? "Drop your PDF here" : "Drop a PDF, or click to upload"}
        </h3>
        <p className="text-sm text-muted-foreground">
          We'll parse the layout so you can edit text word by word.
        </p>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        Supported: .pdf — runs entirely in your browser
      </div>
    </div>
  );
}
