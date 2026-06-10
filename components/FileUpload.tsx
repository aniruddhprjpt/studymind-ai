"use client";

import { useCallback, useState } from "react";

interface FileUploadProps {
  onUploadComplete: (data: {
    filename: string;
    fileSize: number;
    charCount: number;
    documentContent: string;
    summary: string;
    suggestedQuestions: string[];
  }) => void;
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
}

const ALLOWED_EXTS = ["pdf", "docx", "pptx"];
const MAX_PDF_MB = 15;    // PDFs parsed in browser — no server limit
const MAX_OTHER_MB = 4;   // DOCX/PPTX go through server (Vercel 4.5MB cap)

async function extractPDFText(file: File, onProgress: (p: number) => void): Promise<string> {
  // unpdf — lightweight, no canvas dependency, works in browser + edge
  const { extractText, getDocumentProxy } = await import("unpdf");

  onProgress(10);
  const arrayBuffer = await file.arrayBuffer();
  onProgress(25);

  const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
  onProgress(35);

  const { text } = await extractText(pdf, { mergePages: true });
  onProgress(50);

  return (text ?? "").trim();
}

export default function FileUpload({
  onUploadComplete,
  isUploading,
  setIsUploading,
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");

  const validateFile = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTS.includes(ext)) {
      return "Only PDF, DOCX, and PPTX files are supported.";
    }
    const maxMB = ext === "pdf" ? MAX_PDF_MB : MAX_OTHER_MB;
    if (file.size > maxMB * 1024 * 1024) {
      return `File too large. PDFs up to ${MAX_PDF_MB}MB, DOCX/PPTX up to ${MAX_OTHER_MB}MB.`;
    }
    return null;
  };

  const processFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setIsUploading(true);
      setProgress(5);

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const isPDF = ext === "pdf";

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any;

        if (isPDF) {
          // ── PDF: parse in browser, send only text to server ──
          setStage("Reading PDF pages...");
          let text = "";
          try {
            text = await extractPDFText(file, (p) => {
              setProgress(5 + p); // 5–55%
            });
          } catch (pdfErr) {
            throw new Error(
              "Could not read this PDF. It may be password-protected or corrupted. Try another file."
            );
          }

          if (!text || text.trim().length < 50) {
            throw new Error(
              "No text found in this PDF. It may be a scanned/image-only document."
            );
          }

          setProgress(60);
          setStage("Generating summary with AI...");

          // Truncate before sending — Vercel rejects request bodies over ~4MB
          // 80,000 chars ≈ 80KB of JSON — well within limits, enough for AI
          const truncatedText = text.slice(0, 80_000);

          const res = await fetch("/api/process-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: truncatedText, filename: file.name, fileSize: file.size }),
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let parsed: any;
          try {
            parsed = await res.json();
          } catch {
            throw new Error(`Server returned non-JSON (status ${res.status}). Please try again.`);
          }
          if (!res.ok) throw new Error(parsed.error ?? `Processing failed (status ${res.status})`);
          data = parsed;

        } else {
          // ── DOCX / PPTX: send to server (under 4MB) ──
          setProgress(20);
          setStage("Uploading document...");

          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          setProgress(60);
          setStage("Generating summary with AI...");

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let parsed: any;
          try {
            parsed = await res.json();
          } catch {
            throw new Error(
              res.status === 413
                ? "File too large. Please use a file under 4MB."
                : "Upload failed. Please try again."
            );
          }

          if (!res.ok) throw new Error(parsed.error ?? "Upload failed");
          data = parsed;
        }

        setProgress(100);
        setStage("Done!");
        onUploadComplete(data);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        setIsUploading(false);
        setProgress(0);
        setStage("");
      }
    },
    [onUploadComplete, setIsUploading]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  return (
    <div className="w-full">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className="relative flex flex-col items-center justify-center w-full min-h-[180px] rounded-xl cursor-pointer"
        style={{
          border: dragOver
            ? "1.5px dashed rgba(245,197,24,0.5)"
            : "1.5px dashed rgba(255,255,255,0.1)",
          background: dragOver
            ? "rgba(245,197,24,0.05)"
            : "rgba(17,30,54,0.4)",
          transition: "border-color 180ms ease, background-color 180ms ease",
          pointerEvents: isUploading ? "none" : undefined,
        }}
        onMouseEnter={(e) => {
          if (!isUploading && !dragOver) {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
          }
        }}
        onMouseLeave={(e) => {
          if (!dragOver) {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          }
        }}
      >
        {isUploading ? (
          /* ── Upload progress state ── */
          <div className="flex flex-col items-center gap-4 px-6 w-full">
            {/* Spinner */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "#111e36" }}
            >
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                style={{ color: "#f5c518" }}
              >
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>

            {/* Stage label */}
            <div className="text-center">
              <p className="text-[#eef2f9] text-xs font-medium">{stage}</p>
              <p className="text-[#475569] text-[11px] mt-0.5">Please wait…</p>
            </div>

            {/* Progress bar — thin, clean */}
            <div
              className="w-full max-w-[220px] rounded-full overflow-hidden"
              style={{ height: 3, background: "#111e36" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #f5c518 0%, #60a5fa 100%)",
                  transition: "width 400ms cubic-bezier(0.23,1,0.32,1)",
                }}
              />
            </div>

            <p className="text-[#475569] text-[11px] font-mono">{progress}%</p>
          </div>
        ) : (
          /* ── Idle state ── */
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            {/* Upload icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
              style={{
                background: "#111e36",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: "#94a3b8" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <div>
              <p className="text-[#eef2f9] text-sm font-medium">
                Drop your study material here
              </p>
              <p className="text-[#475569] text-xs mt-1">or click to browse files</p>
            </div>

            {/* Format badges */}
            <div className="flex gap-1.5 mt-1">
              {["PDF", "DOCX", "PPTX"].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider"
                  style={{
                    background: "#111e36",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 5,
                    color: "#94a3b8",
                  }}
                >
                  {fmt}
                </span>
              ))}
            </div>

            <p className="text-[#475569] text-[11px]">
              PDF up to <span style={{ color: "#f5c518", fontWeight: 600 }}>15MB</span> · DOCX/PPTX up to 4MB
            </p>
          </div>
        )}

        <input
          type="file"
          accept=".pdf,.docx,.pptx"
          onChange={handleFileInput}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={isUploading}
        />
      </label>

      {/* Error state */}
      {error && (
        <div
          className="mt-2.5 flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
          style={{
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
        >
          <svg
            className="w-3.5 h-3.5 shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            style={{ color: "#f87171" }}
          >
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
          </svg>
          <p className="text-[#f87171] text-xs leading-relaxed">{error}</p>
        </div>
      )}
    </div>
  );
}
