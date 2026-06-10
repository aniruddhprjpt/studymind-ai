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
const MAX_PDF_MB   = 15;
const MAX_OTHER_MB = 4;

async function extractPDFText(file: File, onProgress: (p: number) => void): Promise<string> {
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

export default function FileUpload({ onUploadComplete, isUploading, setIsUploading }: FileUploadProps) {
  const [dragOver, setDragOver]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [progress, setProgress]   = useState(0);
  const [stage, setStage]         = useState("");

  const validateFile = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTS.includes(ext)) return "Only PDF, DOCX, and PPTX files are supported.";
    const maxMB = ext === "pdf" ? MAX_PDF_MB : MAX_OTHER_MB;
    if (file.size > maxMB * 1024 * 1024)
      return `File too large. PDFs up to ${MAX_PDF_MB}MB, DOCX/PPTX up to ${MAX_OTHER_MB}MB.`;
    return null;
  };

  const processFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) { setError(validationError); return; }

      setError(null);
      setIsUploading(true);
      setProgress(5);

      const ext   = file.name.split(".").pop()?.toLowerCase() ?? "";
      const isPDF = ext === "pdf";

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any;

        if (isPDF) {
          setStage("Reading PDF pages…");
          let text = "";
          try {
            text = await extractPDFText(file, (p) => setProgress(5 + p));
          } catch {
            throw new Error("Could not read this PDF. It may be password-protected or corrupted.");
          }
          if (!text || text.trim().length < 50)
            throw new Error("No text found in this PDF. It may be a scanned/image-only document.");

          setProgress(60);
          setStage("Generating summary with AI…");

          const res = await fetch("/api/process-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text.slice(0, 80_000), filename: file.name, fileSize: file.size }),
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let parsed: any;
          try { parsed = await res.json(); }
          catch { throw new Error(`Server returned non-JSON (status ${res.status}). Please try again.`); }
          if (!res.ok) throw new Error(parsed.error ?? `Processing failed (status ${res.status})`);
          data = parsed;

        } else {
          setProgress(20);
          setStage("Uploading document…");
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/upload", { method: "POST", body: formData });
          setProgress(60);
          setStage("Generating summary with AI…");

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let parsed: any;
          try { parsed = await res.json(); }
          catch {
            throw new Error(res.status === 413
              ? "File too large. Please use a file under 4MB."
              : "Upload failed. Please try again.");
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

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
        className="relative flex flex-col items-center justify-center w-full rounded-xl cursor-pointer"
        style={{
          minHeight: 200,
          border: dragOver
            ? "1.5px dashed rgba(196,113,237,0.7)"
            : "1.5px dashed rgba(196,113,237,0.28)",
          background: dragOver
            ? "rgba(196,113,237,0.10)"
            : "rgba(196,113,237,0.04)",
          transition: "border-color 180ms ease, background-color 180ms ease",
          pointerEvents: isUploading ? "none" : undefined,
        }}
        onMouseEnter={(e) => {
          if (!isUploading && !dragOver)
            e.currentTarget.style.borderColor = "rgba(196,113,237,0.50)";
        }}
        onMouseLeave={(e) => {
          if (!dragOver)
            e.currentTarget.style.borderColor = "rgba(196,113,237,0.28)";
        }}
      >
        {isUploading ? (
          /* ── Uploading state ── */
          <div className="flex flex-col items-center gap-4 px-6 py-8 w-full">
            {/* Spinner ring */}
            <div className="relative w-12 h-12">
              <svg className="absolute inset-0 w-12 h-12 animate-spin" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="rgba(196,113,237,0.15)" strokeWidth="3" />
                <path d="M24 4 A20 20 0 0 1 44 24" stroke="url(#spin-grad)" strokeWidth="3" strokeLinecap="round" />
                <defs>
                  <linearGradient id="spin-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#C471ED" />
                    <stop offset="100%" stopColor="#00D4FF" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="text-center">
              <p style={{ color: "#e9d5ff", fontSize: 13, fontWeight: 500 }}>{stage}</p>
              <p style={{ color: "rgba(196,113,237,0.55)", fontSize: 11, marginTop: 3 }}>Please wait…</p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-[240px] rounded-full overflow-hidden" style={{ height: 3, background: "rgba(196,113,237,0.12)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #7B2FBE 0%, #C471ED 50%, #00D4FF 100%)",
                  transition: "width 400ms cubic-bezier(0.23,1,0.32,1)",
                  boxShadow: "0 0 8px rgba(196,113,237,0.6)",
                }}
              />
            </div>
            <p style={{ color: "rgba(196,113,237,0.55)", fontSize: 11, fontFamily: "monospace" }}>{progress}%</p>
          </div>

        ) : (
          /* ── Idle state ── */
          <div className="flex flex-col items-center gap-3 py-10 px-8 text-center">
            {/* Upload icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
              style={{
                background: "rgba(196,113,237,0.10)",
                border: "1px solid rgba(196,113,237,0.22)",
                boxShadow: "0 0 24px rgba(196,113,237,0.15)",
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="url(#upload-grad)" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="upload-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor="#C471ED" />
                    <stop offset="100%" stopColor="#00D4FF" />
                  </linearGradient>
                </defs>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <div>
              <p style={{ color: "#f0e8ff", fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>
                Drop your study material here
              </p>
              <p style={{ color: "rgba(196,113,237,0.55)", fontSize: 12, marginTop: 4 }}>
                or click to browse files
              </p>
            </div>

            {/* Format badges */}
            <div className="flex gap-2 mt-1">
              {[
                { label: "PDF",  color: "#FF4DC4" },
                { label: "DOCX", color: "#C471ED" },
                { label: "PPTX", color: "#4FACFE" },
              ].map(({ label, color }) => (
                <span
                  key={label}
                  style={{
                    padding: "2px 10px",
                    fontSize: 10,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    borderRadius: 6,
                    background: `rgba(${label === "PDF" ? "255,77,196" : label === "DOCX" ? "196,113,237" : "79,172,254"},0.10)`,
                    border: `1px solid ${color}40`,
                    color,
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            <p style={{ color: "rgba(196,113,237,0.45)", fontSize: 11, marginTop: 2 }}>
              PDF up to <span style={{ color: "#C471ED", fontWeight: 600 }}>15MB</span>
              {" · "}DOCX/PPTX up to <span style={{ color: "#4FACFE", fontWeight: 600 }}>4MB</span>
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

      {/* Error */}
      {error && (
        <div
          className="mt-3 flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
          style={{
            background: "rgba(255,77,196,0.07)",
            border: "1px solid rgba(255,77,196,0.22)",
            backdropFilter: "blur(8px)",
          }}
        >
          <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" style={{ color: "#FF4DC4" }}>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
          </svg>
          <p style={{ color: "#FF4DC4", fontSize: 12, lineHeight: 1.5 }}>{error}</p>
        </div>
      )}
    </div>
  );
}
