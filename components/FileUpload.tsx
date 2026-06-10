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
const MAX_SIZE_MB = 4; // Vercel Hobby plan caps request body at 4.5MB

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
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File size must be under ${MAX_SIZE_MB}MB.`;
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
      setProgress(10);
      setStage("Parsing document...");

      const formData = new FormData();
      formData.append("file", file);

      try {
        setProgress(30);
        setStage("Extracting text...");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        setProgress(70);
        setStage("Generating summary with AI...");

        // Guard against non-JSON responses (e.g. Vercel 413 body-size error)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any;
        try {
          data = await res.json();
        } catch {
          if (res.status === 413 || !res.ok) {
            throw new Error("File is too large. Please use a file under 4MB.");
          }
          throw new Error("Upload failed. Please try again.");
        }

        if (!res.ok) {
          throw new Error(data.error ?? "Upload failed");
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
            <div className="shimmer-icon w-14 h-14 rounded-full bg-[#1a2340] flex items-center justify-center">
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
            <p className="text-[#8892a4] text-xs mt-1">Max 4MB per file</p>
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
