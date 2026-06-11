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
const Lightfall = dynamic(() => import("@/components/Lightfall"), { ssr: false });
import DecryptedText from "@/components/DecryptedText";
import {
  ChatCircle, Brain, Cards, ChartBar, Upload, ArrowUp,
} from "@phosphor-icons/react";

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

// ── Icons ────────────────────────────────────────────────────────────────────

const IconDoc = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const IconChat = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const IconQuiz = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const IconUpload = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const IconExpand = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const IconCompress = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
  </svg>
);

const IconBack = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const IconChevron = () => (
  <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// ── Logo ─────────────────────────────────────────────────────────────────────

const LogoMark = () => (
  <div className="w-8 h-8 rounded-lg bg-[#f5c518] flex items-center justify-center shrink-0">
    <svg className="w-4.5 h-4.5 text-[#000000]" fill="currentColor" viewBox="0 0 20 20" style={{ width: 18, height: 18 }}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

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
    <div
      className="min-h-screen text-[#eef2f9] relative overflow-hidden"
      style={{ background: "#000000" }}
    >
      {/* Lightfall — fixed full-viewport nebula streaks background */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <Lightfall
          colors={["#7B2FBE", "#C471ED", "#00D4FF", "#FF4DC4", "#4FACFE"]}
          backgroundColor="#1a0033"
          speed={0.6}
          streakCount={6}
          streakWidth={0.9}
          streakLength={1.2}
          glow={1.4}
          density={0.7}
          twinkle={0.8}
          zoom={2.5}
          backgroundGlow={0.4}
          opacity={1}
          mouseInteraction={true}
          mouseStrength={0.8}
          mouseRadius={0.7}
          mouseDampening={0.2}
        />
      </div>

      {/* Focus mode backdrop */}
      {focusMode && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm cursor-pointer"
          onClick={() => setFocusMode(false)}
        />
      )}

      {/* ── Top Bar ── */}
      <header
        className="relative z-40 border-b backdrop-blur-md"
        style={{
          borderColor: "rgba(196,113,237,0.15)",
          background: "rgba(2,0,8,0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 py-2.5 flex items-center gap-3">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <LogoMark />
            <div className="hidden sm:block">
              <h1 className="text-[#eef2f9] font-bold text-sm leading-none tracking-tight">StudyMind AI</h1>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(196,113,237,0.6)" }}>Powered by LLaMA 3</p>
            </div>
          </div>

          {/* Center widgets */}
          <div className="flex items-center gap-2 flex-1 justify-center overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <PomodoroTimer focusMode={focusMode} onFocusToggle={() => setFocusMode(!focusMode)} />
            <ExamCountdown />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <DocumentLibrary
              onSelect={handleSelectFromLibrary}
              currentFilename={doc?.filename}
            />

            {doc && (
              <>
                {/* Active file badge */}
                <div
                  className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    background: "rgba(13,13,13,0.8)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span className="text-[#f5c518]"><IconDoc /></span>
                  <span className="text-[#eef2f9] font-medium max-w-[120px] truncate">{doc.filename}</span>
                  <span className="text-[#475569]">{formatBytes(doc.fileSize)}</span>
                </div>

                {doc2 && (
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.97]"
                    style={{
                      transition: "background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
                      background: compareMode ? "rgba(96,165,250,0.15)" : "rgba(96,165,250,0.08)",
                      border: compareMode ? "1px solid rgba(96,165,250,0.4)" : "1px solid rgba(96,165,250,0.2)",
                      color: "#60a5fa",
                    }}
                  >
                    ⚖️ <span className="hidden sm:inline">{compareMode ? "Compare ON" : "Compare"}</span>
                  </button>
                )}

                <button
                  onClick={() => { setQuizTopicFilter(undefined); setShowQuiz(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.97]"
                  style={{
                    background: "#f5c518",
                    color: "#000000",
                    boxShadow: "0 1px 12px rgba(245,197,24,0.2)",
                    transition: "background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease",
                  }}
                >
                  <IconQuiz />
                  <span className="hidden sm:inline">Mock Exam</span>
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium active:scale-[0.97]"
                  style={{
                    background: "rgba(13,13,13,0.6)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#94a3b8",
                    transition: "color 150ms ease, background-color 150ms ease, transform 150ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#eef2f9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; }}
                >
                  <IconUpload />
                  <span className="hidden sm:inline">New File</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="relative z-10 max-w-screen-2xl mx-auto px-4 py-4 h-[calc(100vh-53px)]">

        {!doc ? (
          /* ── Landing / Upload View ── */
          <div className="flex items-center justify-center h-full px-4">
            <div
              className="w-full animate-fadeSlideUp relative z-10"
              style={{ maxWidth: 560 }}
            >

              {/* ── Hero ── */}
              <div className="text-center mb-8">

                {/* Feature pills — single row */}
                <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
                  {([
                    { Icon: ChatCircle,  label: "Smart Chat"  },
                    { Icon: Brain,       label: "Mind Maps"   },
                    { Icon: Cards,       label: "Flashcards"  },
                    { Icon: ChartBar,    label: "Progress"    },
                  ] as const).map(({ Icon, label }, i) => (
                    <span
                      key={label}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-default select-none"
                      style={{
                        background: "rgba(0,0,0,0.50)",
                        border: "1px solid rgba(196,113,237,0.30)",
                        backdropFilter: "blur(14px)",
                        WebkitBackdropFilter: "blur(14px)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                        animation: `staggerFadeUp 340ms cubic-bezier(0.23,1,0.32,1) ${i * 60}ms both`,
                        fontSize: 12,
                        fontWeight: 500,
                        letterSpacing: "0.01em",
                      }}
                    >
                      <Icon size={13} weight="fill" color="#C471ED" />
                      <DecryptedText
                        text={label}
                        animateOn="hover"
                        speed={35}
                        maxIterations={10}
                        sequential={true}
                        revealDirection="start"
                        characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$"
                        className="text-[#e2d9f3]"
                        encryptedClassName="text-[#C471ED]"
                      />
                    </span>
                  ))}
                </div>

                {/* Display headline — Space Grotesk, display scale */}
                <h1
                  className="font-bold tracking-[-0.03em] leading-[1.05] mb-5"
                  style={{
                    fontFamily: "var(--font-space, 'Space Grotesk', system-ui)",
                    fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
                  }}
                >
                  <span style={{
                    background: "linear-gradient(160deg, #ffffff 0%, #e9d5ff 35%, #C471ED 65%, #00D4FF 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    display: "block",
                  }}>
                    Study Smarter.
                  </span>
                  <span style={{
                    background: "linear-gradient(160deg, #FF4DC4 0%, #C471ED 45%, #4FACFE 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    display: "block",
                  }}>
                    Not Harder.
                  </span>
                </h1>

                {/* Subtitle — max 18 words, no em-dash */}
                <p
                  className="mx-auto"
                  style={{
                    color: "rgba(216, 195, 255, 0.75)",
                    fontSize: "clamp(0.9rem, 1.8vw, 1.05rem)",
                    lineHeight: 1.7,
                    maxWidth: 420,
                    fontWeight: 400,
                  }}
                >
                  Upload any study material. AI explains it, quizzes you,
                  and builds mind maps in seconds.
                </p>
              </div>

              {/* ── Upload card ── */}
              {/* Gradient border wrapper — 1px */}
              <div
                style={{
                  borderRadius: 20,
                  padding: "1px",
                  background: "linear-gradient(135deg, rgba(196,113,237,0.50) 0%, rgba(79,172,254,0.28) 50%, rgba(255,77,196,0.30) 100%)",
                  boxShadow: "0 0 60px rgba(196,113,237,0.18), 0 24px 80px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  style={{
                    borderRadius: 19,
                    background: "rgba(3,0,12,0.68)",
                    backdropFilter: "blur(28px)",
                    WebkitBackdropFilter: "blur(28px)",
                    padding: "28px 28px 24px",
                  }}
                >
                  <FileUpload
                    onUploadComplete={handleUploadComplete}
                    isUploading={isUploading}
                    setIsUploading={setIsUploading}
                  />
                </div>
              </div>

            </div>
          </div>

        ) : (
          /* ── Main App View ── */
          <div className="flex h-full gap-3">

            {/* ── Left Panel ── */}
            <div className={`flex flex-col gap-3 w-full md:w-[360px] lg:w-[400px] xl:w-[420px] shrink-0 ${mobileShowRight ? "hidden md:flex" : "flex"}`}>

              {/* Document area */}
              <div
                className="rounded-xl p-3 shrink-0 space-y-2.5"
                style={{
                  background: "#0d0d0d",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Doc 1 info */}
                <div
                  className="flex items-center gap-2.5 p-2.5 rounded-lg"
                  style={{
                    background: "#141414",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(245,197,24,0.1)",
                      border: "1px solid rgba(245,197,24,0.2)",
                    }}
                  >
                    <span style={{ color: "#f5c518" }}><IconDoc /></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#eef2f9] text-xs font-medium truncate">{doc.filename}</p>
                    <p className="text-[#475569] text-[11px] mt-0.5">{formatBytes(doc.fileSize)} · {doc.charCount.toLocaleString()} chars</p>
                  </div>
                  <span className="text-[#34d399] text-[11px] shrink-0 font-medium">✓ Doc 1</span>
                </div>

                {/* Doc 2 */}
                {doc2 ? (
                  <div
                    className="flex items-center gap-2.5 p-2.5 rounded-lg"
                    style={{
                      background: "#141414",
                      border: "1px solid rgba(96,165,250,0.15)",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(96,165,250,0.1)",
                        border: "1px solid rgba(96,165,250,0.2)",
                      }}
                    >
                      <span style={{ color: "#60a5fa" }}><IconDoc /></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#eef2f9] text-xs font-medium truncate">{doc2.filename}</p>
                      <p className="text-[#475569] text-[11px] mt-0.5">{formatBytes(doc2.fileSize)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[#60a5fa] text-[11px] font-medium">✓ Doc 2</span>
                      <button
                        onClick={() => { setDoc2(null); setCompareMode(false); }}
                        className="text-[#475569] hover:text-[#f87171] text-xs active:scale-[0.97]"
                        style={{ transition: "color 150ms ease, transform 150ms ease" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[#475569] text-[11px] mb-2 flex items-center gap-1">
                      <span>⚖️</span> Upload a 2nd doc to enable Compare Mode:
                    </p>
                    <FileUpload
                      onUploadComplete={handleUpload2Complete}
                      isUploading={isUploading2}
                      setIsUploading={setIsUploading2}
                    />
                  </div>
                )}

                {/* Replace doc 1 */}
                <details className="group">
                  <summary
                    className="text-[#475569] text-[11px] cursor-pointer select-none list-none flex items-center gap-1.5"
                    style={{ transition: "color 150ms ease" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#94a3b8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; }}
                  >
                    <IconChevron />
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

              {/* Left tab panel */}
              <div
                className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0"
                style={{
                  background: "#0d0d0d",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Tab bar */}
                <div
                  className="flex items-center shrink-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {LEFT_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setLeftTab(tab.id)}
                        className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 flex-1 justify-center active:scale-[0.97]"
                        title={tab.label}
                        style={{
                          borderColor: leftTab === tab.id ? "#f5c518" : "transparent",
                          color: leftTab === tab.id ? "#f5c518" : "#475569",
                          background: leftTab === tab.id ? "rgba(245,197,24,0.04)" : "transparent",
                          transition: "color 150ms ease, background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
                        }}
                        onMouseEnter={(e) => {
                          if (leftTab !== tab.id) e.currentTarget.style.color = "#94a3b8";
                        }}
                        onMouseLeave={(e) => {
                          if (leftTab !== tab.id) e.currentTarget.style.color = "#475569";
                        }}
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
                    className="shrink-0 w-8 h-8 mx-1.5 rounded-lg flex items-center justify-center active:scale-[0.97]"
                    style={{
                      color: "#475569",
                      border: "1px solid transparent",
                      transition: "color 150ms ease, background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#f5c518";
                      e.currentTarget.style.backgroundColor = "rgba(245,197,24,0.08)";
                      e.currentTarget.style.borderColor = "rgba(245,197,24,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#475569";
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                  >
                    <IconExpand />
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
            <div
              className={`flex-1 flex flex-col rounded-xl overflow-hidden min-w-0 ${mobileShowRight ? "flex" : "hidden md:flex"}`}
              style={{
                background: "#0d0d0d",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Chat header */}
              <div
                className="flex items-center px-4 py-2.5 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <button
                  onClick={() => setMobileShowRight(false)}
                  className="md:hidden mr-3 active:scale-[0.97]"
                  style={{
                    color: "#475569",
                    transition: "color 150ms ease, transform 150ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#eef2f9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; }}
                >
                  <IconBack />
                </button>

                <div className="flex items-center gap-2">
                  <span style={{ color: "#f5c518" }}><IconChat /></span>
                  <span className="text-[#eef2f9] text-sm font-semibold">AI Chat</span>
                  {compareMode && doc2 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(96,165,250,0.1)",
                        border: "1px solid rgba(96,165,250,0.25)",
                        color: "#60a5fa",
                      }}
                    >
                      ⚖️ Compare
                    </span>
                  )}
                </div>

                <button
                  onClick={() => { setQuizTopicFilter(undefined); setShowQuiz(true); }}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.97]"
                  style={{
                    background: "rgba(245,197,24,0.08)",
                    border: "1px solid rgba(245,197,24,0.2)",
                    color: "#f5c518",
                    transition: "background-color 150ms ease, transform 150ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(245,197,24,0.14)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(245,197,24,0.08)"; }}
                >
                  <IconQuiz />
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

              {/* Weak Area Tracker */}
              <WeakAreaTracker
                documentContent={doc.documentContent}
                onRevise={handleRevise}
                onRetryQuiz={handleRetryQuiz}
              />
            </div>

            {/* Mobile toggle button */}
            <button
              onClick={() => setMobileShowRight(!mobileShowRight)}
              className="fixed bottom-4 right-4 md:hidden z-20 w-12 h-12 rounded-full flex items-center justify-center active:scale-[0.97]"
              style={{
                background: "#f5c518",
                color: "#000000",
                boxShadow: "0 4px 20px rgba(245,197,24,0.35)",
                transition: "transform 150ms ease",
              }}
            >
              {mobileShowRight ? <IconDoc /> : <IconChat />}
            </button>
          </div>
        )}
      </main>

      {/* ── Fullscreen Left Panel Overlay ── */}
      {leftMaximized && doc && (
        <div
          className="fixed inset-0 z-50 flex flex-col animate-fadeIn"
          style={{ background: "#000000" }}
        >
          {/* Fullscreen header */}
          <div
            className="flex items-center px-4 py-2 shrink-0 gap-2"
            style={{
              background: "#0d0d0d",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex flex-1 overflow-x-auto gap-1" style={{ scrollbarWidth: "none" }}>
              {LEFT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLeftTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg active:scale-[0.97]"
                  style={{
                    background: leftTab === tab.id ? "rgba(245,197,24,0.08)" : "transparent",
                    border: leftTab === tab.id ? "1px solid rgba(245,197,24,0.25)" : "1px solid transparent",
                    color: leftTab === tab.id ? "#f5c518" : "#475569",
                    transition: "color 150ms ease, background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (leftTab !== tab.id) e.currentTarget.style.color = "#94a3b8";
                  }}
                  onMouseLeave={(e) => {
                    if (leftTab !== tab.id) e.currentTarget.style.color = "#475569";
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setLeftMaximized(false)}
              title="Exit fullscreen"
              className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium active:scale-[0.97]"
              style={{
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#94a3b8",
                transition: "color 150ms ease, border-color 150ms ease, transform 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f5c518";
                e.currentTarget.style.borderColor = "rgba(245,197,24,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              <IconCompress />
              Exit Fullscreen
            </button>

            <span className="hidden md:block text-[#475569] text-xs shrink-0">
              Press{" "}
              <kbd
                className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{
                  background: "#141414",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                Esc
              </kbd>{" "}
              to exit
            </span>
          </div>

          {/* Fullscreen content */}
          <div className="flex-1 overflow-hidden p-4 min-h-0">
            {leftTab === "notes" && <NotesPanel documentContent={doc.documentContent} filename={doc.filename} />}
            {leftTab === "mindmap" && (
              <MindMap
                documentContent={doc.documentContent}
                onNodeClick={(label) => { handleMindMapNodeClick(label); setLeftMaximized(false); }}
              />
            )}
            {leftTab === "formulas" && (
              <FormulaExtractor
                documentContent={doc.documentContent}
                onExplain={(text) => { handleFormulaExplain(text); setLeftMaximized(false); }}
              />
            )}
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
