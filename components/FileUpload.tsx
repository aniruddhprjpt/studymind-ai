"use client";

import { useCallback, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Use local worker file (copied to /public) — reliable, no CDN dependency
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

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
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    text += content.items.map((item: any) => item.str ?? "").join(" ") + "\n";
    onProgress(Math.round((i / pdf.numPages) * 50)); // 0–50%
  }
  return text.trim();
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
          const text = await extractPDFText(file, (p) => {
            setProgress(5 + p); // 5–55%
          });

          if (!text || text.trim().length < 50) {
            throw new Error(
              "Could not extract text from this PDF. It may be scanned/image-only."
            );
          }

          setProgress(60);
          setStage("Generating summary with AI...");

          const res = await fetch("/api/process-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, filename: file.name, fileSize: file.size }),
          });

          data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Processing failed");

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
        className={`
          relative flex flex-col items-center justify-center w-full min-h-[200px]
          border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300
          ${dragOver
            ? "border-[#f5c842] bg-[#f5c842]/10 scale-[1.02]"
            : "border-[rgba(245,200,66,0.3)] bg-[#0d1526] hover:border-[rgba(245,200,66,0.6)] hover:bg-[#f5c842]/5"
          }
          ${isUploading ? "pointer-events-none" : ""}
          upload-zone-glow
        `}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-4 px-6 w-full">
            <div className="w-14 h-14 rounded-full bg-[#1a2340] flex items-center justify-center">
              <svg className="w-7 h-7 text-[#f5c842] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[#f5c842] font-semibold text-sm tracking-wide uppercase">{stage}</p>
              <p className="text-[#8892a4] text-xs mt-1">Please wait...</p>
            </div>
            <div className="w-full max-w-xs bg-[#1a2340] rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#f5c842] to-[#4fc3f7] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[#f5c842] text-xs font-mono">{progress}%</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1a2340] border border-[rgba(245,200,66,0.2)] flex items-center justify-center mb-2">
              <svg className="w-8 h-8 text-[#f5c842]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-[#f0f4ff] font-semibold text-base">
                Drop your study material here
              </p>
              <p className="text-[#8892a4] text-sm mt-1">or click to browse files</p>
            </div>
            <div className="flex gap-2 mt-2">
              {["PDF", "DOCX", "PPTX"].map((fmt) => (
                <span key={fmt} className="px-2.5 py-0.5 bg-[#1a2340] border border-[rgba(245,200,66,0.2)] rounded text-[#f5c842] text-xs font-mono font-bold tracking-widest">
                  {fmt}
                </span>
              ))}
            </div>
            <p className="text-[#8892a4] text-xs mt-1">
              PDF up to <span className="text-[#f5c842] font-semibold">15MB</span> · DOCX/PPTX up to 4MB
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

      {error && (
        <div className="mt-3 flex items-start gap-2 p-3 bg-[#f87171]/10 border border-[#f87171]/30 rounded-lg">
          <svg className="w-4 h-4 text-[#f87171] mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
          </svg>
          <p className="text-[#f87171] text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
