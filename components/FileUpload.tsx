"use client";

import { useCallback, useState } from "react";
import {
  UploadSimple, FilePdf, FileDoc, FilePpt,
  SpinnerGap, CheckCircle, WarningCircle,
} from "@phosphor-icons/react";

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

const FORMAT_META = [
  { ext: "PDF",  Icon: FilePdf,  color: "#FF4DC4", bg: "rgba(255,77,196,0.10)",  border: "rgba(255,77,196,0.22)"  },
  { ext: "DOCX", Icon: FileDoc,  color: "#C471ED", bg: "rgba(196,113,237,0.10)", border: "rgba(196,113,237,0.22)" },
  { ext: "PPTX", Icon: FilePpt,  color: "#4FACFE", bg: "rgba(79,172,254,0.10)",  border: "rgba(79,172,254,0.22)"  },
];

export default function FileUpload({ onUploadComplete, isUploading, setIsUploading }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage]       = useState("");

  const validateFile = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTS.includes(ext)) return "Only PDF, DOCX, and PPTX files are supported.";
    const maxMB = ext === "pdf" ? MAX_PDF_MB : MAX_OTHER_MB;
    if (file.size > maxMB * 1024 * 1024)
      return `File too large. PDFs up to ${MAX_PDF_MB} MB, DOCX/PPTX up to ${MAX_OTHER_MB} MB.`;
    return null;
  };

  const processFile = useCallback(async (file: File) => {
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
        setStage("Reading PDF pages...");
        let text = "";
        try {
          text = await extractPDFText(file, (p) => setProgress(5 + p));
        } catch {
          throw new Error("Could not read this PDF. It may be password-protected or corrupted.");
        }
        if (!text || text.trim().length < 50)
          throw new Error("No text found. This PDF may be a scanned or image-only document.");

        setProgress(60);
        setStage("Generating summary with AI...");

        const res = await fetch("/api/process-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.slice(0, 80_000), filename: file.name, fileSize: file.size }),
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsed: any;
        try   { parsed = await res.json(); }
        catch { throw new Error(`Server returned non-JSON (status ${res.status}). Try again.`); }
        if (!res.ok) throw new Error(parsed.error ?? `Processing failed (status ${res.status})`);
        data = parsed;

      } else {
        setProgress(20);
        setStage("Uploading document...");
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        setProgress(60);
        setStage("Generating summary with AI...");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsed: any;
        try { parsed = await res.json(); }
        catch {
          throw new Error(res.status === 413
            ? "File too large. Use a file under 4 MB."
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
  }, [onUploadComplete, setIsUploading]);

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

  const isDragActive = dragOver && !isUploading;

  return (
    <div className="w-full">
      <label
        onDragOver={(e) => { e.preventDefault(); if (!isUploading) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          minHeight: 220,
          borderRadius: 14,
          border: isDragActive
            ? "1.5px dashed rgba(196,113,237,0.85)"
            : "1.5px dashed rgba(196,113,237,0.25)",
          background: isDragActive
            ? "rgba(196,113,237,0.08)"
            : "transparent",
          cursor: isUploading ? "default" : "pointer",
          transition: "border-color 160ms ease, background 160ms ease",
          pointerEvents: isUploading ? "none" : undefined,
        }}
        onMouseEnter={(e) => {
          if (!isUploading && !dragOver)
            e.currentTarget.style.borderColor = "rgba(196,113,237,0.50)";
        }}
        onMouseLeave={(e) => {
          if (!dragOver)
            e.currentTarget.style.borderColor = "rgba(196,113,237,0.25)";
        }}
      >
        {isUploading ? (
          /* ── Uploading ── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 24px", width: "100%" }}>
            {/* Animated spinner icon */}
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(196,113,237,0.10)",
              border: "1px solid rgba(196,113,237,0.20)",
            }}>
              <SpinnerGap
                size={26}
                color="#C471ED"
                style={{ animation: "spin 0.8s linear infinite" }}
              />
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#e9d5ff", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                {stage}
              </p>
              <p style={{ color: "rgba(196,113,237,0.50)", fontSize: 12 }}>
                Please wait...
              </p>
            </div>

            {/* Progress bar */}
            <div style={{ width: "100%", maxWidth: 260, height: 3, borderRadius: 99, background: "rgba(196,113,237,0.12)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${progress}%`,
                borderRadius: 99,
                background: "linear-gradient(90deg, #7B2FBE 0%, #C471ED 50%, #00D4FF 100%)",
                boxShadow: "0 0 8px rgba(196,113,237,0.6)",
                transition: "width 380ms cubic-bezier(0.23,1,0.32,1)",
              }} />
            </div>

            <p style={{ color: "rgba(196,113,237,0.45)", fontSize: 11, fontFamily: "monospace" }}>
              {progress}%
            </p>
          </div>

        ) : (
          /* ── Idle ── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "40px 24px 32px" }}>

            {/* Upload icon */}
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(196,113,237,0.08)",
              border: "1px solid rgba(196,113,237,0.18)",
              boxShadow: "0 0 32px rgba(196,113,237,0.12)",
            }}>
              <UploadSimple size={28} weight="duotone" color="#C471ED" />
            </div>

            {/* Copy */}
            <div style={{ textAlign: "center" }}>
              <p style={{
                fontFamily: "var(--font-sora, 'Sora', system-ui)",
                color: "#f0e8ff",
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                marginBottom: 6,
              }}>
                Drop your study material here
              </p>
              <p style={{ color: "rgba(196,113,237,0.50)", fontSize: 13 }}>
                or click to browse files
              </p>
            </div>

            {/* Format badges */}
            <div style={{ display: "flex", gap: 8 }}>
              {FORMAT_META.map(({ ext, Icon, color, bg, border }) => (
                <div
                  key={ext}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 8,
                    background: bg,
                    border: `1px solid ${border}`,
                  }}
                >
                  <Icon size={14} weight="fill" color={color} />
                  <span style={{
                    color,
                    fontSize: 11,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}>
                    {ext}
                  </span>
                </div>
              ))}
            </div>

            {/* Size limits */}
            <p style={{ color: "rgba(196,113,237,0.38)", fontSize: 11 }}>
              PDF up to{" "}
              <span style={{ color: "#FF4DC4", fontWeight: 600 }}>15 MB</span>
              {" · "}
              DOCX/PPTX up to{" "}
              <span style={{ color: "#4FACFE", fontWeight: 600 }}>4 MB</span>
            </p>
          </div>
        )}

        <input
          type="file"
          accept=".pdf,.docx,.pptx"
          onChange={handleFileInput}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
          disabled={isUploading}
        />
      </label>

      {/* Error state */}
      {error && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          marginTop: 12, padding: "12px 14px", borderRadius: 12,
          background: "rgba(255,77,196,0.06)",
          border: "1px solid rgba(255,77,196,0.20)",
          backdropFilter: "blur(8px)",
        }}>
          <WarningCircle size={16} weight="fill" color="#FF4DC4" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: "#FF4DC4", fontSize: 13, lineHeight: 1.5 }}>{error}</p>
        </div>
      )}
    </div>
  );
}
