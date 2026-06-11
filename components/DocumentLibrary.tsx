"use client";

import { useState, useEffect } from "react";
import ReactDOM from "react-dom";

export interface LibraryDoc {
  id: string;
  filename: string;
  fileSize: number;
  charCount: number;
  documentContent: string;
  summary: string;
  suggestedQuestions: string[];
  savedAt: number;
}

const LIBRARY_KEY = "studymind_doc_library";
const MAX_DOCS = 10;
const MAX_CONTENT_CHARS = 80_000; // ~20k tokens max per doc

export function saveDocToLibrary(doc: Omit<LibraryDoc, "id" | "savedAt">): void {
  try {
    const existing = getLibraryDocs();
    const idx = existing.findIndex((d) => d.filename === doc.filename);
    const entry: LibraryDoc = {
      id: idx >= 0 ? existing[idx].id : `doc_${Date.now()}`,
      ...doc,
      documentContent: doc.documentContent.slice(0, MAX_CONTENT_CHARS),
      savedAt: Date.now(),
    };
    const updated =
      idx >= 0
        ? existing.map((d, i) => (i === idx ? entry : d))
        : [entry, ...existing].slice(0, MAX_DOCS);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(updated));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

export function getLibraryDocs(): LibraryDoc[] {
  try {
    const data = localStorage.getItem(LIBRARY_KEY);
    return data ? (JSON.parse(data) as LibraryDoc[]) : [];
  } catch {
    return [];
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface Props {
  onSelect: (doc: LibraryDoc) => void;
  currentFilename?: string;
}

export default function DocumentLibrary({ onSelect, currentFilename }: Props) {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [mounted, setMounted] = useState(false);
  const [count, setCount] = useState(0);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  useEffect(() => {
    setMounted(true);
    setCount(getLibraryDocs().length);
  }, []);

  useEffect(() => {
    if (!open) setCount(getLibraryDocs().length);
  }, [open]);

  const openModal = () => {
    setDocs(getLibraryDocs());
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setRenaming(null);
  };

  const deleteDoc = (id: string) => {
    const updated = docs.filter((d) => d.id !== id);
    setDocs(updated);
    setCount(updated.length);
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const confirmRename = (id: string) => {
    if (!renameVal.trim()) { setRenaming(null); return; }
    const updated = docs.map((d) =>
      d.id === id ? { ...d, filename: renameVal.trim() } : d
    );
    setDocs(updated);
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
    setRenaming(null);
  };

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!mounted) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a2340] border border-[rgba(196,113,237,0.2)] text-[#8892a4] rounded-lg text-xs opacity-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414A1 1 0 0120 8.414V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
        <span className="hidden sm:inline">Library</span>
      </button>
    );
  }

  const trigger = (
    <button
      onClick={openModal}
      title="Document Library"
      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a2340] border border-[rgba(196,113,237,0.2)] text-[#8892a4] rounded-lg text-xs hover:text-[#c471ed] hover:border-[#c471ed]/40 transition-[color,border-color,background-color] duration-150 active:scale-[0.97]"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414A1 1 0 0120 8.414V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
      <span className="hidden sm:inline">Library</span>
      {count > 0 && (
        <span className="hidden sm:inline ml-0.5 text-[#c471ed] font-bold tabular-nums">
          ({count})
        </span>
      )}
    </button>
  );

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: "rgba(10,15,30,0.85)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
      onClick={closeModal}
    >
      <div
        className="bg-[#111827] border border-[rgba(196,113,237,0.15)] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(196,113,237,0.05)]"
        style={{ animation: "modalIn 220ms cubic-bezier(0.23,1,0.32,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[rgba(196,113,237,0.08)] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#c471ed]/10 border border-[#c471ed]/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#c471ed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414A1 1 0 0120 8.414V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          </div>
          <div>
            <h2 className="text-[#f0f4ff] font-bold text-sm">Document Library</h2>
            <p className="text-[#8892a4] text-xs">
              {docs.length} saved document{docs.length !== 1 ? "s" : ""} · max {MAX_DOCS}
            </p>
          </div>
          <button
            onClick={closeModal}
            className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-[#8892a4] hover:text-[#f0f4ff] hover:bg-[#1a2340] transition-[color,background-color] duration-150 active:scale-[0.97]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
          {docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1a2340] border border-[rgba(196,113,237,0.1)] flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-[#8892a4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414A1 1 0 0120 8.414V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
              </div>
              <p className="text-[#f0f4ff] text-sm font-semibold">Library is empty</p>
              <p className="text-[#8892a4] text-xs mt-1.5 max-w-[200px] leading-relaxed">
                Upload a document and it will be saved here automatically
              </p>
            </div>
          ) : (
            docs.map((d, i) => {
              const isActive = d.filename === currentFilename;
              return (
                <div
                  key={d.id}
                  className={`group flex items-center gap-3 p-3 rounded-xl border transition-[border-color,background-color] duration-150 ${
                    isActive
                      ? "bg-[#c471ed]/5 border-[#c471ed]/25"
                      : "bg-[#0d1526] border-[rgba(196,113,237,0.06)] hover:border-[rgba(196,113,237,0.2)]"
                  }`}
                  style={{ animation: `staggerFadeUp 240ms cubic-bezier(0.23,1,0.32,1) ${i * 40}ms both` }}
                >
                  {/* File icon */}
                  <div
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-[#c471ed]/15 border-[#c471ed]/30"
                        : "bg-[#1a2340] border-[rgba(196,113,237,0.1)]"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 ${isActive ? "text-[#c471ed]" : "text-[#8892a4]"}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  {/* Name + meta */}
                  <div
                    className="flex-1 min-w-0"
                    onClick={() => { if (!isActive) { onSelect(d); closeModal(); } }}
                  >
                    {renaming === d.id ? (
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onBlur={() => confirmRename(d.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRename(d.id);
                          if (e.key === "Escape") setRenaming(null);
                        }}
                        className="w-full bg-[#0a0f1e] border border-[#c471ed]/40 rounded-lg px-2 py-1 text-[#f0f4ff] text-xs focus:outline-none focus:border-[#c471ed]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <p
                          className={`text-xs font-medium truncate ${
                            isActive ? "text-[#c471ed]" : "text-[#f0f4ff] cursor-pointer"
                          }`}
                        >
                          {d.filename}
                        </p>
                        <p className="text-[#8892a4] text-xs mt-0.5">
                          {formatBytes(d.fileSize)} · {d.charCount.toLocaleString()} chars · {formatDate(d.savedAt)}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {isActive ? (
                    <span className="shrink-0 text-[#4ade80] text-xs font-semibold px-2 py-0.5 bg-[#4ade80]/10 rounded-full border border-[#4ade80]/20">
                      Active
                    </span>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenaming(d.id);
                          setRenameVal(d.filename);
                        }}
                        title="Rename"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8892a4] hover:text-[#c471ed] hover:bg-[#c471ed]/10 transition-[color,background-color] duration-150 active:scale-[0.97]"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteDoc(d.id); }}
                        title="Delete from library"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8892a4] hover:text-[#f87171] hover:bg-[#f87171]/10 transition-[color,background-color] duration-150 active:scale-[0.97]"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { onSelect(d); closeModal(); }}
                        className="px-2.5 py-1 bg-[#c471ed]/10 border border-[#c471ed]/25 text-[#c471ed] rounded-lg text-xs font-semibold hover:bg-[#c471ed]/20 transition-[background-color] duration-150 active:scale-[0.97]"
                      >
                        Open
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-[rgba(196,113,237,0.08)] shrink-0">
          <p className="text-[#8892a4] text-xs text-center">
            Stored in your browser · max {MAX_DOCS} documents
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {trigger}
      {open && ReactDOM.createPortal(modal, document.body)}
    </>
  );
}
