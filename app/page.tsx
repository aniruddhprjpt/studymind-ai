"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import FileUpload from "@/components/FileUpload";
import ChatPanel from "@/components/ChatPanel";
import NotesPanel from "@/components/NotesPanel";
import PomodoroTimer from "@/components/PomodoroTimer";
import ExamCountdown from "@/components/ExamCountdown";
import WeakAreaTracker from "@/components/WeakAreaTracker";
import StudyPlan from "@/components/StudyPlan";
import ProgressDashboard from "@/components/ProgressDashboard";
import FormulaExtractor from "@/components/FormulaExtractor";
import DocumentLibrary, { saveDocToLibrary, type LibraryDoc } from "@/components/DocumentLibrary";

const QuizModal = dynamic(() => import("@/components/QuizModal"), { ssr: false });
const MindMap = dynamic(() => import("@/components/MindMap"), { ssr: false });
const FlashcardDeck = dynamic(() => import("@/components/FlashcardDeck"), { ssr: false });

interface DocumentState {
  filename: string;
  fileSize: number;
  charCount: number;
  documentContent: string;
  summary: string;
  suggestedQuestions: string[];
}

type LeftTab = "notes" | "mindmap" | "formulas" | "flashcards" | "studyplan" | "dashboard";

const LEFT_TABS: { id: LeftTab; label: string; icon: string }[] = [
  { id: "notes", label: "Notes", icon: "📋" },
  { id: "mindmap", label: "Mind Map", icon: "🧠" },
  { id: "formulas", label: "Formulas", icon: "🔬" },
  { id: "flashcards", label: "Flashcards", icon: "🃏" },
  { id: "studyplan", label: "Study Plan", icon: "🗓️" },
  { id: "dashboard", label: "Progress", icon: "📊" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ParticleBackground() {
  const particles = [
    { w: 3, l: 12, t: 8, gold: true, delay: 0, dur: 14 },
    { w: 2, l: 28, t: 35, gold: false, delay: 2.1, dur: 11 },
    { w: 4, l: 45, t: 60, gold: true, delay: 1.3, dur: 16 },
    { w: 2, l: 67, t: 20, gold: false, delay: 3.5, dur: 13 },
    { w: 3, l: 82, t: 75, gold: true, delay: 0.8, dur: 18 },
    { w: 2, l: 15, t: 88, gold: false, delay: 4.2, dur: 12 },
    { w: 4, l: 55, t: 42, gold: true, delay: 1.9, dur: 15 },
    { w: 2, l: 93, t: 55, gold: false, delay: 2.7, dur: 10 },
    { w: 3, l: 38, t: 15, gold: true, delay: 5.1, dur: 17 },
    { w: 2, l: 72, t: 90, gold: false, delay: 0.4, dur: 14 },
    { w: 3, l: 5, t: 50, gold: true, delay: 3.3, dur: 11 },
    { w: 2, l: 88, t: 30, gold: false, delay: 1.6, dur: 16 },
  ];
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle absolute rounded-full opacity-25"
          style={{
            width: p.w + "px",
            height: p.w + "px",
            left: p.l + "%",
            top: p.t + "%",
            background: p.gold ? "#f5c842" : "#4fc3f7",
            animationDelay: p.delay + "s",
            animationDuration: p.dur + "s",
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [doc, setDoc] = useState<DocumentState | null>(null);
  const [doc2, setDoc2] = useState<DocumentState | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploading2, setIsUploading2] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>("notes");
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizTopicFilter, setQuizTopicFilter] = useState<string | undefined>();
  const [mobileShowRight, setMobileShowRight] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [preFillMessage, setPreFillMessage] = useState("");
  const [leftMaximized, setLeftMaximized] = useState(false);

  // Escape key exits fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLeftMaximized(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleUploadComplete = (data: DocumentState) => {
    setDoc(data);
    setLeftTab("notes");
    setMobileShowRight(true);
    setCompareMode(false);
    // Save to library
    saveDocToLibrary(data);
    try {
      const prev = parseInt(localStorage.getItem("studymind_docs_count") ?? "0", 10);
      localStorage.setItem("studymind_docs_count", String(prev + 1));
    } catch { /* ignore */ }
  };

  const handleUpload2Complete = (data: DocumentState) => {
    setDoc2(data);
    saveDocToLibrary(data);
    try {
      const prev = parseInt(localStorage.getItem("studymind_docs_count") ?? "0", 10);
      localStorage.setItem("studymind_docs_count", String(prev + 1));
    } catch { /* ignore */ }
  };

  const handleSelectFromLibrary = (libDoc: LibraryDoc) => {
    setDoc(libDoc);
    setLeftTab("notes");
    setMobileShowRight(true);
    setCompareMode(false);
    setDoc2(null);
    setShowQuiz(false);
    setPreFillMessage("");
  };

  const handleReset = () => {
    setDoc(null);
    setDoc2(null);
    setCompareMode(false);
    setShowQuiz(false);
    setMobileShowRight(false);
    setPreFillMessage("");
    setLeftTab("notes");
    setQuizTopicFilter(undefined);
  };

  const handleRevise = (topic: string) => {
    setPreFillMessage(`Please explain the topic "${topic}" in detail with examples from the document.`);
    setMobileShowRight(true);
  };

  const handleRetryQuiz = (topic: string) => {
    setQuizTopicFilter(topic);
    setShowQuiz(true);
  };

  const handleMindMapNodeClick = (label: string) => {
    setPreFillMessage(`Tell me more about "${label}" based on the document.`);
    setMobileShowRight(true);
  };

  const handleFormulaExplain = (text: string) => {
    setPreFillMessage(`Explain this from the document: ${text}`);
    setMobileShowRight(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-[#f0f4ff] relative overflow-hidden">
      <ParticleBackground />

      {/* Focus mode backdrop */}
      {focusMode && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm cursor-pointer"
          onClick={() => setFocusMode(false)}
        />
      )}

      {/* Top Bar */}
      <header className="relative z-40 border-b border-[rgba(245,200,66,0.1)] bg-[#0a0f1e]/90 backdrop-blur-md">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f5c842] to-[#e0a800] flex items-center justify-center shadow-[0_0_20px_rgba(245,200,66,0.4)]">
              <svg className="w-5 h-5 text-[#0a0f1e]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-[#f0f4ff] font-black text-lg leading-none tracking-tight">StudyMind AI</h1>
              <p className="text-[#8892a4] text-xs">Powered by LLaMA 3.3-70B</p>
            </div>
          </div>

          {/* Center widgets */}
          <div className="flex items-center gap-2 flex-1 justify-center overflow-x-auto scrollbar-none">
            <PomodoroTimer focusMode={focusMode} onFocusToggle={() => setFocusMode(!focusMode)} />
            <ExamCountdown />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Library always visible */}
            <DocumentLibrary
              onSelect={handleSelectFromLibrary}
              currentFilename={doc?.filename}
            />

            {doc && (
              <>
                <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-[#111827] border border-[rgba(245,200,66,0.15)] rounded-lg">
                  <svg className="w-3.5 h-3.5 text-[#f5c842]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-[#f0f4ff] text-xs font-medium max-w-[120px] truncate">{doc.filename}</span>
                  <span className="text-[#8892a4] text-xs">{formatBytes(doc.fileSize)}</span>
                </div>

                {doc2 && (
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-[color,background-color,box-shadow] duration-150 active:scale-[0.97] ${
                      compareMode
                        ? "bg-[#4fc3f7] text-[#0a0f1e] shadow-[0_0_16px_rgba(79,195,247,0.3)]"
                        : "bg-[#4fc3f7]/10 border border-[#4fc3f7]/30 text-[#4fc3f7] hover:bg-[#4fc3f7]/20"
                    }`}
                  >
                    ⚖️ <span className="hidden sm:inline">{compareMode ? "Compare ON" : "Compare"}</span>
                  </button>
                )}

                <button
                  onClick={() => { setQuizTopicFilter(undefined); setShowQuiz(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5c842] text-[#0a0f1e] rounded-lg text-xs font-bold hover:bg-[#ffd84d] shadow-[0_0_16px_rgba(245,200,66,0.25)] transition-[background-color,box-shadow] duration-150 active:scale-[0.97]"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span className="hidden sm:inline">Mock Exam</span>
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a2340] border border-[rgba(245,200,66,0.2)] text-[#8892a4] rounded-lg text-xs hover:text-[#f0f4ff] hover:border-[#f5c842]/40 transition-[color,border-color,background-color] duration-150 active:scale-[0.97]"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="hidden sm:inline">New File</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-screen-2xl mx-auto px-4 py-4 h-[calc(100vh-65px)]">
        {!doc ? (
          /* ── Landing / Upload View ── */
          <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-2xl animate-fadeSlideUp">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#f5c842]/10 border border-[#f5c842]/30 rounded-full text-[#f5c842] text-xs font-semibold uppercase tracking-widest mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f5c842] animate-pulse" />
                  AI-Powered Study Assistant
                </div>
                <h2 className="text-4xl sm:text-5xl font-black text-[#f0f4ff] leading-tight mb-4">
                  Study Smarter,{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f5c842] to-[#4fc3f7]">
                    Not Harder
                  </span>
                </h2>
                <p className="text-[#8892a4] text-base leading-relaxed max-w-lg mx-auto">
                  Upload your study material and let AI explain it, test you, generate mind maps, flashcards and more — powered by LLaMA 3.3-70B.
                </p>
              </div>

              <div className="bg-[#111827] border border-[rgba(245,200,66,0.1)] rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
                <FileUpload
                  onUploadComplete={handleUploadComplete}
                  isUploading={isUploading}
                  setIsUploading={setIsUploading}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6">
                {[
                  { icon: "💬", label: "Smart Chat", desc: "Ask anything about your document" },
                  { icon: "🧠", label: "Mind Map", desc: "Visual concept maps" },
                  { icon: "🃏", label: "Flashcards", desc: "Spaced repetition study" },
                ].map((f, i) => (
                  <div
                    key={f.label}
                    className="bg-[#111827] border border-[rgba(245,200,66,0.08)] rounded-xl p-3 text-center hover:border-[rgba(245,200,66,0.2)] transition-[border-color] duration-200"
                    style={{ animation: `staggerFadeUp 380ms cubic-bezier(0.23,1,0.32,1) ${120 + i * 70}ms both` }}
                  >
                    <div className="text-2xl mb-1.5">{f.icon}</div>
                    <p className="text-[#f0f4ff] text-xs font-semibold">{f.label}</p>
                    <p className="text-[#8892a4] text-xs mt-0.5 leading-tight">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Main App View ── */
          <div className="flex h-full gap-4">

            {/* ── Left Panel ── */}
            <div className={`flex flex-col gap-3 w-full md:w-[360px] lg:w-[400px] xl:w-[420px] shrink-0 ${mobileShowRight ? "hidden md:flex" : "flex"}`}>

              {/* Document upload area */}
              <div className="bg-[#111827] border border-[rgba(245,200,66,0.1)] rounded-2xl p-3 shrink-0 space-y-3">
                {/* Doc 1 info */}
                <div className="flex items-center gap-2 p-2.5 bg-[#0d1526] rounded-xl border border-[rgba(245,200,66,0.1)]">
                  <div className="w-7 h-7 rounded-lg bg-[#f5c842]/10 border border-[#f5c842]/20 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-[#f5c842]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f0f4ff] text-xs font-medium truncate">{doc.filename}</p>
                    <p className="text-[#8892a4] text-xs">{formatBytes(doc.fileSize)} · {doc.charCount.toLocaleString()} chars</p>
                  </div>
                  <span className="text-[#4ade80] text-xs shrink-0">✓ Doc 1</span>
                </div>

                {/* Doc 2 — shown when uploaded or always-visible upload */}
                {doc2 ? (
                  <div className="flex items-center gap-2 p-2.5 bg-[#0d1526] rounded-xl border border-[rgba(79,195,247,0.2)]">
                    <div className="w-7 h-7 rounded-lg bg-[#4fc3f7]/10 border border-[#4fc3f7]/20 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-[#4fc3f7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#f0f4ff] text-xs font-medium truncate">{doc2.filename}</p>
                      <p className="text-[#8892a4] text-xs">{formatBytes(doc2.fileSize)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[#4fc3f7] text-xs">✓ Doc 2</span>
                      <button onClick={() => { setDoc2(null); setCompareMode(false); }} className="text-[#8892a4] hover:text-[#f87171] text-xs ml-1">✕</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[#8892a4] text-xs mb-1.5 flex items-center gap-1">
                      <span>⚖️</span> Upload a 2nd doc to enable Compare Mode:
                    </p>
                    <FileUpload
                      onUploadComplete={handleUpload2Complete}
                      isUploading={isUploading2}
                      setIsUploading={setIsUploading2}
                    />
                  </div>
                )}

                {/* Swap / replace doc 1 */}
                <details className="group">
                  <summary className="text-[#8892a4] text-xs cursor-pointer hover:text-[#f0f4ff] transition-colors select-none list-none flex items-center gap-1">
                    <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Replace Doc 1
                  </summary>
                  <div className="mt-2">
                    <FileUpload
                      onUploadComplete={handleUploadComplete}
                      isUploading={isUploading}
                      setIsUploading={setIsUploading}
                    />
                  </div>
                </details>
              </div>

              {/* Left tab panel — inline (non-maximised) */}
              <div className="flex-1 bg-[#111827] border border-[rgba(245,200,66,0.1)] rounded-2xl overflow-hidden flex flex-col min-h-0">
                {/* Tab bar */}
                <div className="flex items-center border-b border-[rgba(245,200,66,0.08)] shrink-0">
                  <div className="flex flex-1 overflow-x-auto scrollbar-none">
                    {LEFT_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setLeftTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-[color,background-color,border-color] duration-150 flex-1 justify-center active:scale-[0.97] ${
                          leftTab === tab.id
                            ? "border-[#f5c842] text-[#f5c842] bg-[#f5c842]/5"
                            : "border-transparent text-[#8892a4] hover:text-[#f0f4ff] hover:bg-[#1a2340]/50"
                        }`}
                        title={tab.label}
                      >
                        <span>{tab.icon}</span>
                        <span className="hidden lg:inline">{tab.label}</span>
                      </button>
                    ))}
                  </div>
                  {/* Fullscreen toggle */}
                  <button
                    onClick={() => setLeftMaximized(true)}
                    title="Fullscreen"
                    className="shrink-0 w-8 h-8 mx-1.5 rounded-lg flex items-center justify-center text-[#8892a4] hover:text-[#f5c842] hover:bg-[#f5c842]/10 border border-transparent hover:border-[#f5c842]/20 transition-[color,background-color,border-color] duration-150 active:scale-[0.97]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-hidden p-3 min-h-0">
                  {leftTab === "notes" && <NotesPanel documentContent={doc.documentContent} filename={doc.filename} />}
                  {leftTab === "mindmap" && <MindMap documentContent={doc.documentContent} onNodeClick={handleMindMapNodeClick} />}
                  {leftTab === "formulas" && <FormulaExtractor documentContent={doc.documentContent} onExplain={handleFormulaExplain} />}
                  {leftTab === "flashcards" && <FlashcardDeck documentContent={doc.documentContent} filename={doc.filename} />}
                  {leftTab === "studyplan" && <StudyPlan documentContent={doc.documentContent} />}
                  {leftTab === "dashboard" && <ProgressDashboard />}
                </div>
              </div>
            </div>

            {/* ── Right Panel — Chat ── */}
            <div className={`flex-1 flex flex-col bg-[#111827] border border-[rgba(245,200,66,0.1)] rounded-2xl overflow-hidden min-w-0
              ${mobileShowRight ? "flex" : "hidden md:flex"}
            `}>
              {/* Chat header */}
              <div className="flex items-center border-b border-[rgba(245,200,66,0.08)] px-4 py-2.5 shrink-0">
                <button
                  onClick={() => setMobileShowRight(false)}
                  className="md:hidden mr-3 text-[#8892a4] hover:text-[#f0f4ff] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#f5c842]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-[#f5c842] text-sm font-semibold">AI Chat</span>
                  {compareMode && doc2 && (
                    <span className="text-xs px-2 py-0.5 bg-[#4fc3f7]/10 border border-[#4fc3f7]/30 text-[#4fc3f7] rounded-full">
                      ⚖️ Compare
                    </span>
                  )}
                </div>

                <button
                  onClick={() => { setQuizTopicFilter(undefined); setShowQuiz(true); }}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#f5c842]/10 border border-[#f5c842]/30 text-[#f5c842] rounded-lg text-xs font-bold hover:bg-[#f5c842]/20 transition-[background-color] duration-150 active:scale-[0.97]"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Take Exam
                </button>
              </div>

              {/* Chat panel */}
              <div className="flex-1 overflow-hidden min-h-0">
                <ChatPanel
                  documentContent={doc.documentContent}
                  documentContent2={compareMode && doc2 ? doc2.documentContent : undefined}
                  compareMode={compareMode && !!doc2}
                  filename={doc.filename}
                  filename2={doc2?.filename}
                  summary={doc.summary}
                  suggestedQuestions={doc.suggestedQuestions}
                  preFillMessage={preFillMessage}
                />
              </div>

              {/* Weak Area Tracker — lives at the bottom of the chat panel */}
              <WeakAreaTracker
                documentContent={doc.documentContent}
                onRevise={handleRevise}
                onRetryQuiz={handleRetryQuiz}
              />
            </div>

            {/* Mobile toggle button */}
            <button
              onClick={() => setMobileShowRight(!mobileShowRight)}
              className="fixed bottom-4 right-4 md:hidden z-20 w-12 h-12 rounded-full bg-[#f5c842] text-[#0a0f1e] flex items-center justify-center shadow-[0_0_24px_rgba(245,200,66,0.5)]"
            >
              {mobileShowRight ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </main>

      {/* ── Fullscreen Left Panel Overlay ── */}
      {leftMaximized && doc && (
        <div className="fixed inset-0 z-50 bg-[#0a0f1e] flex flex-col animate-fadeIn">
          {/* Fullscreen header bar */}
          <div className="flex items-center border-b border-[rgba(245,200,66,0.1)] bg-[#111827] px-4 py-2 shrink-0 gap-3">
            {/* Tabs */}
            <div className="flex flex-1 overflow-x-auto scrollbar-none gap-1">
              {LEFT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLeftTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold whitespace-nowrap rounded-lg border transition-[color,background-color,border-color] duration-150 active:scale-[0.97] ${
                    leftTab === tab.id
                      ? "bg-[#f5c842]/10 border-[#f5c842]/40 text-[#f5c842]"
                      : "border-transparent text-[#8892a4] hover:text-[#f0f4ff] hover:bg-[#1a2340]"
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Exit fullscreen button */}
            <button
              onClick={() => setLeftMaximized(false)}
              title="Exit fullscreen"
              className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a2340] border border-[rgba(245,200,66,0.2)] text-[#8892a4] hover:text-[#f5c842] hover:border-[#f5c842]/40 text-xs font-semibold transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
              </svg>
              Exit Fullscreen
            </button>

            {/* Esc hint */}
            <span className="hidden md:block text-[#8892a4] text-xs shrink-0">Press <kbd className="px-1.5 py-0.5 bg-[#0d1526] border border-[rgba(245,200,66,0.2)] rounded text-[10px] font-mono">Esc</kbd> to exit</span>
          </div>

          {/* Fullscreen content */}
          <div className="flex-1 overflow-hidden p-4 min-h-0">
            {leftTab === "notes" && <NotesPanel documentContent={doc.documentContent} filename={doc.filename} />}
            {leftTab === "mindmap" && <MindMap documentContent={doc.documentContent} onNodeClick={(label) => { handleMindMapNodeClick(label); setLeftMaximized(false); }} />}
            {leftTab === "formulas" && <FormulaExtractor documentContent={doc.documentContent} onExplain={(text) => { handleFormulaExplain(text); setLeftMaximized(false); }} />}
            {leftTab === "flashcards" && <FlashcardDeck documentContent={doc.documentContent} filename={doc.filename} />}
            {leftTab === "studyplan" && <StudyPlan documentContent={doc.documentContent} />}
            {leftTab === "dashboard" && <ProgressDashboard />}
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {showQuiz && doc && (
        <QuizModal
          documentContent={doc.documentContent}
          topicFilter={quizTopicFilter}
          onClose={() => {
            setShowQuiz(false);
            setQuizTopicFilter(undefined);
          }}
        />
      )}
    </div>
  );
}
