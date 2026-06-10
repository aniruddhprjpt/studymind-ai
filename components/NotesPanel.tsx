"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

type Depth = "quick" | "deep";

interface NotesPanelProps {
  documentContent: string;
  filename: string;
}

const DEPTH_OPTIONS: { id: Depth; label: string; icon: string; desc: string }[] = [
  { id: "quick", label: "Quick Summary", icon: "⚡", desc: "TL;DR + key points in ~1 min" },
  { id: "deep",  label: "Deep Notes",   icon: "📖", desc: "Full explanations, examples & connections" },
];

export default function NotesPanel({ documentContent, filename }: NotesPanelProps) {
  const [notes, setNotes] = useState<string | null>(null);
  const [depth, setDepth] = useState<Depth>("deep");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateNotes = async (d: Depth = depth) => {
    setIsGenerating(true);
    setError(null);
    setNotes(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentContent, depth: d }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotes(data.notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate notes");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyNotes = () => {
    if (!notes) return;
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printNotes = () => {
    if (!notes) return;
    const win = window.open("", "_blank");
    if (!win) return;

    // Minimal markdown → HTML for clean print output
    const html = notes
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/^---+$/gm, "<hr>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^\|(.+)\|$/gm, (row) => {
        const cells = row.split("|").filter(Boolean).map((c) => `<td>${c.trim()}</td>`).join("");
        return `<tr>${cells}</tr>`;
      })
      .replace(/^[-*+] (.+)$/gm, "<li>$1</li>")
      .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
      .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
      .replace(/\n\n+/g, "</p><p>")
      .replace(/\n/g, " ");

    const base = filename.replace(/\.[^/.]+$/, "");
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${base} — Study Notes</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      max-width: 760px;
      margin: 2.5rem auto;
      padding: 0 2rem;
      color: #1a1a1a;
      line-height: 1.75;
      font-size: 15px;
    }
    .meta {
      font-family: system-ui, sans-serif;
      font-size: 11px;
      color: #888;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
    }
    h1 { font-size: 1.7rem; margin: 2rem 0 0.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid #1a1a1a; line-height: 1.3; }
    h2 { font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.06em; color: #333; margin: 2rem 0 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid #ccc; font-family: system-ui, sans-serif; }
    h3 { font-size: 1.05rem; color: #222; margin: 1.5rem 0 0.4rem; font-family: system-ui, sans-serif; }
    h4 { font-size: 0.95rem; color: #333; margin: 1.25rem 0 0.3rem; font-family: system-ui, sans-serif; }
    p  { margin: 0.75rem 0; }
    ul, ol { padding-left: 1.5rem; margin: 0.75rem 0; }
    li { margin: 0.35rem 0; }
    strong { font-weight: 700; }
    em     { font-style: italic; }
    code   { font-family: "Courier New", monospace; font-size: 0.85em; background: #f3f3f3; padding: 0.1em 0.35em; border-radius: 3px; }
    blockquote { border-left: 3px solid #555; margin: 1rem 0; padding: 0.6rem 1rem; background: #f8f8f8; font-style: italic; color: #444; }
    hr { border: none; border-top: 1px solid #ddd; margin: 1.5rem 0; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.9em; font-family: system-ui, sans-serif; }
    td, th { border: 1px solid #ccc; padding: 0.4rem 0.75rem; text-align: left; vertical-align: top; }
    tr:nth-child(even) td { background: #f9f9f9; }
    @media print {
      body { margin: 0; padding: 0; font-size: 13px; }
      @page { margin: 2cm 1.8cm; }
      h1, h2, h3 { page-break-after: avoid; }
      table, blockquote, ul, ol { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="meta">
    <span>📚 StudyMind AI — Study Notes</span>
    <span>${base} · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
  </div>
  <div>${html}</div>
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`);
    win.document.close();
  };

  const downloadNotes = (ext: "txt" | "md") => {
    if (!notes) return;
    const base = filename.replace(/\.[^/.]+$/, "");
    const mime = ext === "md" ? "text/markdown" : "text/plain";
    const blob = new Blob([notes], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}-study-notes.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Empty / error state ── */
  if (!notes && !isGenerating) {
    return (
      <div className="flex flex-col h-full gap-5 py-4">
        {/* Depth selector */}
        <div>
          <p className="text-[#8892a4] text-xs uppercase tracking-widest font-semibold mb-2.5">Note Style</p>
          <div className="grid grid-cols-2 gap-2">
            {DEPTH_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDepth(opt.id)}
                className={`p-3 rounded-xl border text-left transition-[border-color,background-color,box-shadow] duration-150 active:scale-[0.97] ${
                  depth === opt.id
                    ? "bg-[#f5c842]/10 border-[#f5c842]/50 shadow-[0_0_12px_rgba(245,200,66,0.1)]"
                    : "bg-[#0d1526] border-[rgba(245,200,66,0.1)] hover:border-[rgba(245,200,66,0.3)]"
                }`}
              >
                <div className="text-xl mb-1">{opt.icon}</div>
                <p className={`text-xs font-bold ${depth === opt.id ? "text-[#f5c842]" : "text-[#f0f4ff]"}`}>{opt.label}</p>
                <p className="text-[#8892a4] text-xs mt-0.5 leading-tight">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* What deep notes include */}
        {depth === "deep" && (
          <div className="bg-[#0d1526] border border-[rgba(79,195,247,0.15)] rounded-xl p-3 space-y-1.5">
            <p className="text-[#4fc3f7] text-xs font-semibold uppercase tracking-widest mb-2">Deep Notes include:</p>
            {[
              "📌 Full explanation of every concept (what, why, how)",
              "🌍 Real-world examples for each topic",
              "🔗 How concepts connect to each other",
              "📊 Definitions table with importance column",
              "⚠️ Common misconceptions & exam tips",
              "🎯 5 must-remember takeaways",
            ].map((item) => (
              <p key={item} className="text-[#8892a4] text-xs">{item}</p>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-[#f87171]/10 border border-[#f87171]/30 rounded-xl">
            <svg className="w-4 h-4 text-[#f87171] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
            </svg>
            <p className="text-[#f87171] text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={() => generateNotes(depth)}
          className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#f5c842] text-[#0a0f1e] rounded-xl font-bold text-sm shadow-[0_0_24px_rgba(245,200,66,0.3)] hover:bg-[#ffd84d] hover:shadow-[0_0_32px_rgba(245,200,66,0.4)] transition-[background-color,box-shadow] duration-150 active:scale-[0.97]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generate {depth === "quick" ? "Quick Summary" : "Deep Study Notes"}
        </button>
      </div>
    );
  }

  /* ── Generating state ── */
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-[#f5c842]/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[#f5c842] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-xl">
            {depth === "quick" ? "⚡" : "📖"}
          </div>
        </div>
        <div className="text-center">
          <p className="text-[#f5c842] font-semibold">
            {depth === "quick" ? "Summarising..." : "Writing deep notes..."}
          </p>
          <p className="text-[#8892a4] text-sm mt-1">
            {depth === "deep" ? "This takes ~20 seconds — detailed explanations take time" : "Almost there..."}
          </p>
        </div>
        <div className="w-full max-w-sm space-y-2.5 mt-2">
          {[85, 55, 70, 40, 65, 80, 45, 60].map((w, i) => (
            <div
              key={i}
              className="skeleton-shimmer h-2.5 rounded-full bg-[#1a2340]"
              style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Notes view ── */
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 pb-3 shrink-0 flex-wrap">
        {/* Depth badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
          depth === "deep"
            ? "bg-[#4fc3f7]/10 border-[#4fc3f7]/30 text-[#4fc3f7]"
            : "bg-[#f5c842]/10 border-[#f5c842]/30 text-[#f5c842]"
        }`}>
          {depth === "deep" ? "📖 Deep Notes" : "⚡ Quick Summary"}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Switch depth */}
          <button
            onClick={() => { setNotes(null); setError(null); }}
            title="Change note style"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1a2340] border border-[rgba(245,200,66,0.15)] text-[#8892a4] rounded-lg text-xs hover:text-[#f0f4ff] hover:border-[#f5c842]/30 transition-[color,border-color,background-color] duration-150 active:scale-[0.97]"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Switch
          </button>

          {/* Regenerate */}
          <button
            onClick={() => generateNotes(depth)}
            title="Regenerate"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1a2340] border border-[rgba(245,200,66,0.15)] text-[#8892a4] rounded-lg text-xs hover:text-[#f0f4ff] hover:border-[#f5c842]/30 transition-[color,border-color,background-color] duration-150 active:scale-[0.97]"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Redo
          </button>

          {/* Copy */}
          <button
            onClick={copyNotes}
            title="Copy to clipboard"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-[color,border-color,background-color] duration-150 active:scale-[0.97] ${
              copied
                ? "bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]"
                : "bg-[#1a2340] border-[rgba(245,200,66,0.15)] text-[#8892a4] hover:text-[#f0f4ff] hover:border-[#f5c842]/30"
            }`}
          >
            {copied ? (
              <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied</>
            ) : (
              <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
            )}
          </button>

          {/* Print */}
          <button
            onClick={printNotes}
            title="Print / Save as PDF"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1a2340] border border-[rgba(245,200,66,0.15)] text-[#8892a4] rounded-lg text-xs hover:text-[#f0f4ff] hover:border-[#f5c842]/30 transition-[color,border-color,background-color] duration-150 active:scale-[0.97]"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>

          {/* Download dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 px-2.5 py-1.5 bg-[#f5c842] text-[#0a0f1e] rounded-lg text-xs font-bold hover:bg-[#ffd84d] transition-[background-color] duration-150 shadow-[0_0_12px_rgba(245,200,66,0.2)] active:scale-[0.97]">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Save ▾
            </button>
            <div className="absolute right-0 top-8 z-20 hidden group-hover:flex flex-col bg-[#111827] border border-[rgba(245,200,66,0.2)] rounded-xl shadow-xl overflow-hidden min-w-[120px]"
              style={{ animation: "modalIn 150ms cubic-bezier(0.23,1,0.32,1) both" }}
            >
              <button onClick={() => downloadNotes("md")} className="px-4 py-2.5 text-xs text-[#f0f4ff] hover:bg-[#f5c842]/10 text-left transition-[background-color] duration-150">.md file</button>
              <button onClick={() => downloadNotes("txt")} className="px-4 py-2.5 text-xs text-[#f0f4ff] hover:bg-[#f5c842]/10 text-left transition-[background-color] duration-150">.txt file</button>
            </div>
          </div>
        </div>
      </div>

      {/* Notes content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
        <div className="prose prose-invert max-w-none text-sm

          prose-h1:text-lg prose-h1:font-black prose-h1:text-[#f0f4ff] prose-h1:mb-4 prose-h1:pb-2 prose-h1:border-b prose-h1:border-[rgba(245,200,66,0.15)]

          prose-h2:text-sm prose-h2:font-bold prose-h2:text-[#f5c842] prose-h2:uppercase prose-h2:tracking-widest prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-1.5 prose-h2:border-b prose-h2:border-[rgba(245,200,66,0.1)]

          prose-h3:text-sm prose-h3:font-bold prose-h3:text-[#4fc3f7] prose-h3:mt-5 prose-h3:mb-2

          prose-p:text-[#d0d8f0] prose-p:leading-7 prose-p:mb-3

          prose-li:text-[#d0d8f0] prose-li:leading-7 prose-li:mb-1.5
          prose-ul:space-y-1 prose-ol:space-y-1

          prose-strong:text-[#f5c842] prose-strong:font-bold

          prose-code:text-[#4fc3f7] prose-code:bg-[#1a2340] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
          prose-pre:bg-[#0d1526] prose-pre:border prose-pre:border-[rgba(79,195,247,0.2)] prose-pre:rounded-xl prose-pre:p-4

          prose-blockquote:border-l-4 prose-blockquote:border-[#f5c842]/50 prose-blockquote:bg-[#f5c842]/5 prose-blockquote:rounded-r-xl prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:my-3 prose-blockquote:not-italic
          prose-blockquote:text-[#f5c842]

          prose-table:border-collapse prose-table:w-full prose-table:text-xs
          prose-thead:bg-[#0d1526]
          prose-th:text-[#f5c842] prose-th:font-semibold prose-th:px-3 prose-th:py-2 prose-th:border prose-th:border-[rgba(245,200,66,0.15)] prose-th:text-left
          prose-td:text-[#d0d8f0] prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-[rgba(245,200,66,0.08)] prose-td:align-top
          prose-tr:even:bg-[#0d1526]/50

          prose-hr:border-[rgba(245,200,66,0.12)] prose-hr:my-6

          prose-a:text-[#4fc3f7] prose-a:no-underline hover:prose-a:underline
        ">
          <ReactMarkdown>{notes ?? ""}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
