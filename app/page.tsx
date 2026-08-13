"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
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
const MagicBento = dynamic(() => import("@/components/MagicBento"), { ssr: false });
const ParticleText = dynamic(() => import("@/components/ParticleText"), { ssr: false });
import DecryptedText from "@/components/DecryptedText";
import {
  ChatCircle, Brain, Cards, ChartBar, Upload, ArrowUp,
} from "@phosphor-icons/react";

interface DocumentState {
  id?: string;          // Supabase document id (set after save)
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

const LogoMark = ({ size = 36 }: { size?: number }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.28),
      background: "linear-gradient(145deg, #f5c518 0%, #e8a800 100%)",
      boxShadow: "0 2px 12px rgba(245,197,24,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <svg fill="#000" viewBox="0 0 20 20" style={{ width: size * 0.52, height: size * 0.52 }}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  </div>
);

// ── Bento panel glow — shared cursor-tracking handler ────────────────────────

function onPanelMouseMove(e: React.MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--smb-glow-x", `${e.clientX - rect.left}px`);
  el.style.setProperty("--smb-glow-y", `${e.clientY - rect.top}px`);
}
function onPanelMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.setProperty("--smb-glow-i", "1");
}
function onPanelMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.setProperty("--smb-glow-i", "0");
}
const bentoPanel = {
  onMouseMove: onPanelMouseMove,
  onMouseEnter: onPanelMouseEnter,
  onMouseLeave: onPanelMouseLeave,
};

// ── Session persistence helpers ───────────────────────────────────────────────

const SESSION_KEY = "studymind_session";

function saveSession(doc: DocumentState | null, doc2: DocumentState | null, leftTab: LeftTab, compareMode: boolean) {
  try {
    if (doc) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ doc, doc2, leftTab, compareMode }));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch { /* quota exceeded or SSR — ignore */ }
}

function loadSession(): { doc: DocumentState; doc2: DocumentState | null; leftTab: LeftTab; compareMode: boolean } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
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
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  // ── Auth: get current user and listen for changes ──
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Restore session on mount (before first paint shows landing page) ──
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      setDoc(saved.doc);
      if (saved.doc2) setDoc2(saved.doc2);
      setLeftTab(saved.leftTab);
      setCompareMode(saved.compareMode);
      setMobileShowRight(true);
    }
    setSessionRestored(true);
  }, []);

  // ── Auto-save tab / compareMode changes to session ──
  useEffect(() => {
    if (sessionRestored && doc) {
      saveSession(doc, doc2, leftTab, compareMode);
    }
  }, [leftTab, compareMode, doc, doc2, sessionRestored]);

  // Escape key exits fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLeftMaximized(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const saveDocToSupabase = async (data: DocumentState): Promise<string | null> => {
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: data.filename,
          file_size: data.fileSize,
          char_count: data.charCount,
          document_content: data.documentContent,
          summary: data.summary,
          suggested_questions: data.suggestedQuestions,
        }),
      });
      const json = await res.json();
      return json.id ?? null;
    } catch { return null; }
  };

  const handleUploadComplete = async (data: DocumentState) => {
    setDoc(data);
    setLeftTab("notes");
    setMobileShowRight(true);
    setCompareMode(false);
    saveDocToLibrary(data);
    // Save to Supabase and attach id for chat history linking
    const id = await saveDocToSupabase(data);
    const enriched = id ? { ...data, id } : data;
    setDoc(enriched);
    saveSession(enriched, doc2, "notes", false);
    try {
      const prev = parseInt(localStorage.getItem("studymind_docs_count") ?? "0", 10);
      localStorage.setItem("studymind_docs_count", String(prev + 1));
    } catch { /* ignore */ }
  };

  const handleUpload2Complete = async (data: DocumentState) => {
    setDoc2(data);
    saveDocToLibrary(data);
    const id = await saveDocToSupabase(data);
    const enriched = id ? { ...data, id } : data;
    setDoc2(enriched);
    saveSession(doc, enriched, leftTab, compareMode);
    try {
      const prev = parseInt(localStorage.getItem("studymind_docs_count") ?? "0", 10);
      localStorage.setItem("studymind_docs_count", String(prev + 1));
    } catch { /* ignore */ }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    handleReset();
  };

  const handleSelectFromLibrary = (libDoc: LibraryDoc) => {
    setDoc(libDoc);
    setLeftTab("notes");
    setMobileShowRight(true);
    setCompareMode(false);
    setDoc2(null);
    setShowQuiz(false);
    setPreFillMessage("");
    saveSession(libDoc, null, "notes", false);
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
    saveSession(null, null, "notes", false);
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
      {/* Lightfall — only on landing page; app view stays pure black */}
      {!doc && <div
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
      </div>}

      {/* Focus mode backdrop */}
      {focusMode && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm cursor-pointer"
          onClick={() => setFocusMode(false)}
        />
      )}

      {/* ── Top Bar ── */}
      {!doc ? (
        /* Landing — floating wordmark only, no border, no bg */
        <header
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            padding: "18px 24px",
            pointerEvents: "none",
            border: "none",
            background: "none",
            outline: "none",
          }}
        >
          {/* Glass pill — gradient border + frosted glass, horizontal layout */}
          <div
            style={{
              pointerEvents: "auto",
              width: "fit-content",
              padding: "1px",
              borderRadius: 16,
              background: "linear-gradient(135deg, rgba(196,113,237,0.50) 0%, rgba(79,172,254,0.25) 55%, rgba(255,77,196,0.30) 100%)",
              animation: "headerIn 500ms cubic-bezier(0.23,1,0.32,1) both",
              boxShadow: "0 6px 32px rgba(0,0,0,0.5), 0 0 0 0 rgba(196,113,237,0)",
              transition: "box-shadow 220ms ease",
              cursor: "default",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 6px 32px rgba(0,0,0,0.5), 0 0 24px rgba(196,113,237,0.22)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 6px 32px rgba(0,0,0,0.5), 0 0 0 0 rgba(196,113,237,0)";
            }}
          >
            {/* Inner frosted glass — row layout */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 0,
                padding: "8px 14px 8px 8px",
                borderRadius: 15,
                background: "rgba(4,0,16,0.65)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
              }}
            >
              {/* Logo mark */}
              <div
                style={{
                  animation: "headerIn 500ms cubic-bezier(0.23,1,0.32,1) both",
                  transition: "transform 160ms cubic-bezier(0.23,1,0.32,1)",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.07)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                <LogoMark size={36} />
              </div>

              {/* Divider */}
              <div style={{
                width: 1, height: 24, margin: "0 11px",
                background: "rgba(196,113,237,0.22)", borderRadius: 99, flexShrink: 0,
                animation: "headerIn 500ms cubic-bezier(0.23,1,0.32,1) 55ms both",
              }} />

              {/* Text */}
              <div style={{ animation: "headerIn 500ms cubic-bezier(0.23,1,0.32,1) 80ms both" }}>
                <p style={{
                  fontFamily: "var(--font-sora, 'Sora', system-ui)",
                  color: "#ffffff", fontWeight: 700, fontSize: 14.5,
                  letterSpacing: "-0.025em", lineHeight: 1,
                }}>
                  StudyMind AI
                </p>
                <p style={{
                  fontSize: 10.5, color: "rgba(196,113,237,0.75)", marginTop: 3.5,
                  letterSpacing: "0.01em", fontWeight: 500,
                  animation: "headerIn 500ms cubic-bezier(0.23,1,0.32,1) 120ms both",
                }}>
                  Powered by LLaMA 3
                </p>
              </div>

              {/* Sign In button — visible when not logged in */}
              {!user && (
                <>
                  <div style={{
                    width: 1, height: 24, margin: "0 11px",
                    background: "rgba(196,113,237,0.22)", borderRadius: 99, flexShrink: 0,
                  }} />
                  <a
                    href="/auth/login"
                    style={{
                      padding: "6px 14px",
                      borderRadius: 10,
                      background: "rgba(196,113,237,0.15)",
                      border: "1px solid rgba(196,113,237,0.35)",
                      color: "#c471ed",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      transition: "background-color 150ms ease",
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = "rgba(196,113,237,0.25)"; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = "rgba(196,113,237,0.15)"; }}
                  >
                    Sign In
                  </a>
                </>
              )}
            </div>
          </div>
        </header>
      ) : (
        /* App view — full sticky header */
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

            {/* Logo — click to go home */}
            <button
              onClick={handleReset}
              className="flex items-center gap-2.5 shrink-0 active:scale-[0.97]"
              style={{ transition: "opacity 150ms ease, transform 150ms ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <LogoMark />
              <div className="hidden sm:block text-left">
                <p className="text-[#eef2f9] font-bold text-sm leading-none tracking-tight">StudyMind AI</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(196,113,237,0.6)" }}>Powered by LLaMA 3</p>
              </div>
            </button>

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
                    <span className="text-[#c471ed]"><IconDoc /></span>
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
                      background: "#c471ed",
                      color: "#fff",
                      boxShadow: "0 1px 12px rgba(196,113,237,0.3)",
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

              {/* ── User avatar + sign-out ── */}
              {user && (
                <div className="flex items-center gap-2 ml-1">
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
                    style={{ background: "rgba(196,113,237,0.15)", border: "1px solid rgba(196,113,237,0.3)", color: "#c471ed" }}
                    title={user.email ?? ""}
                  >
                    {user.user_metadata?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (user.email?.[0] ?? "U").toUpperCase()
                    )}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg active:scale-[0.97]"
                    style={{
                      color: "#475569",
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(13,13,13,0.6)",
                      transition: "color 150ms ease, background-color 150ms ease, transform 150ms ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ── Main ── */}
      <main className={`relative z-10 max-w-screen-2xl mx-auto px-4 py-4 ${doc ? "h-[calc(100vh-53px)]" : "h-screen"}`}>

        {/* Prevent flash of landing page while session is being restored */}
        {!sessionRestored ? null : !doc ? (
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

                {/* Display headline — ParticleText canvas animation */}
                <div className="mb-5" style={{ width: "100%", maxWidth: 560, margin: "0 auto 20px" }}>
                  <ParticleText
                    text="Study Smarter."
                    color="#ffffff"
                    highlightColor="#c471ed"
                    fontSize="clamp(2.4rem, 5.5vw, 4rem)"
                    fontWeight={800}
                    fontFamily="var(--font-sora, 'Sora', system-ui, sans-serif)"
                    particleSize={1.8}
                    density={3}
                    scatter={200}
                    gatherDuration={1400}
                    stagger={380}
                    pointerRepel={50}
                    repelRadius={130}
                    idleDrift={0.5}
                    glow={true}
                    trigger="mount"
                    style={{ height: "clamp(72px, 10vw, 110px)" }}
                  />
                  <ParticleText
                    text="Not Harder."
                    color="#c471ed"
                    highlightColor="#ffffff"
                    fontSize="clamp(2.4rem, 5.5vw, 4rem)"
                    fontWeight={800}
                    fontFamily="var(--font-sora, 'Sora', system-ui, sans-serif)"
                    particleSize={1.8}
                    density={3}
                    scatter={200}
                    gatherDuration={1600}
                    stagger={400}
                    pointerRepel={50}
                    repelRadius={130}
                    idleDrift={0.6}
                    glow={true}
                    trigger="mount"
                    style={{ height: "clamp(72px, 10vw, 110px)", marginTop: -8 }}
                  />
                </div>

                {/* Subtitle — high contrast, dark shadow halo for any bg frame */}
                <p
                  className="mx-auto"
                  style={{
                    color: "#f0eaff",
                    fontSize: "clamp(0.95rem, 1.8vw, 1.08rem)",
                    lineHeight: 1.75,
                    maxWidth: 400,
                    fontWeight: 400,
                    letterSpacing: "0.005em",
                    /* Dark halo ensures legibility over ANY animated frame */
                    textShadow:
                      "0 1px 2px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7), 0 0 40px rgba(0,0,0,0.5)",
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
          <div className="flex flex-col h-full gap-2">

            {/* ── Doc info strip ── */}
            <div
              className="smb-panel shrink-0 px-3 py-2 flex items-center gap-2 flex-wrap"
              {...bentoPanel}
            >
              {/* Doc 1 badge */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{
                  background: "#141414",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(196,113,237,0.1)",
                    border: "1px solid rgba(196,113,237,0.2)",
                  }}
                >
                  <span style={{ color: "#c471ed" }}><IconDoc /></span>
                </div>
                <span className="text-[#eef2f9] text-xs font-medium max-w-[160px] truncate">{doc.filename}</span>
                <span className="text-[#34d399] text-[11px] font-medium shrink-0">✓ Doc 1</span>
                <span className="text-[#475569] text-[11px] shrink-0">{formatBytes(doc.fileSize)}</span>
              </div>

              {/* Doc 2 badge or add button */}
              {doc2 ? (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                  style={{
                    background: "#141414",
                    border: "1px solid rgba(96,165,250,0.15)",
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(96,165,250,0.1)",
                      border: "1px solid rgba(96,165,250,0.2)",
                    }}
                  >
                    <span style={{ color: "#60a5fa" }}><IconDoc /></span>
                  </div>
                  <span className="text-[#eef2f9] text-xs font-medium max-w-[160px] truncate">{doc2.filename}</span>
                  <button
                    onClick={() => { setDoc2(null); setCompareMode(false); }}
                    className="text-[#475569] hover:text-[#f87171] text-xs active:scale-[0.97] shrink-0"
                    style={{ transition: "color 150ms ease, transform 150ms ease" }}
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold active:scale-[0.97] shrink-0"
                    style={{
                      transition: "background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
                      background: compareMode ? "rgba(96,165,250,0.15)" : "rgba(96,165,250,0.08)",
                      border: compareMode ? "1px solid rgba(96,165,250,0.4)" : "1px solid rgba(96,165,250,0.2)",
                      color: "#60a5fa",
                    }}
                  >
                    ⚖ {compareMode ? "Compare ON" : "Compare"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDocPanel(!showDocPanel)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium active:scale-[0.97]"
                  style={{
                    background: showDocPanel ? "rgba(96,165,250,0.1)" : "rgba(13,13,13,0.6)",
                    border: showDocPanel ? "1px solid rgba(96,165,250,0.3)" : "1px solid rgba(255,255,255,0.06)",
                    color: showDocPanel ? "#60a5fa" : "#475569",
                    transition: "color 150ms ease, background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
                  }}
                >
                  ⚖ Add Doc 2
                </button>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Replace Doc 1 toggle */}
              <button
                onClick={() => setShowDocPanel(!showDocPanel)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium active:scale-[0.97]"
                style={{
                  background: showDocPanel ? "rgba(196,113,237,0.08)" : "rgba(13,13,13,0.6)",
                  border: showDocPanel ? "1px solid rgba(196,113,237,0.2)" : "1px solid rgba(255,255,255,0.06)",
                  color: showDocPanel ? "#c471ed" : "#475569",
                  transition: "color 150ms ease, background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
                }}
              >
                <IconChevron />
                Replace Doc 1
              </button>
            </div>

            {/* Collapsible doc management panel */}
            {showDocPanel && (
              <div
                className="smb-panel shrink-0 p-3 space-y-2.5 animate-panelSlideDown"
                {...bentoPanel}
              >
                {!doc2 && (
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
            )}

            {/* ── Content row ── */}
            <div className="flex-1 flex gap-3 min-h-0">

              {/* ── Main area — MagicBento + tab content ── */}
              <div className={`flex-1 flex flex-col gap-2 min-h-0 ${mobileShowRight ? "hidden md:flex" : "flex"}`}>

                {/* MagicBento feature grid — full width */}
                <div className="shrink-0">
                  <MagicBento
                    onSelect={(action) => setLeftTab(action as LeftTab)}
                    activeTab={leftTab}
                    textAutoHide={false}
                    enableStars={true}
                    enableSpotlight={true}
                    enableBorderGlow={true}
                    enableTilt={true}
                    enableMagnetism={true}
                    clickEffect={true}
                    spotlightRadius={300}
                    particleCount={12}
                    glowColor="196, 113, 237"
                  />
                </div>

                {/* Tab content panel */}
                <div
                  className="smb-panel flex-1 flex flex-col min-h-0"
                  {...bentoPanel}
                >
                  {/* Content header */}
                  <div
                    className="flex items-center justify-between px-3 py-2 shrink-0"
                    style={{ borderBottom: "1px solid #1a1726" }}
                  >
                    <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>
                      {LEFT_TABS.find(t => t.id === leftTab)?.icon}{" "}
                      {LEFT_TABS.find(t => t.id === leftTab)?.label}
                    </span>
                    <button
                      onClick={() => setLeftMaximized(true)}
                      title="Fullscreen"
                      className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-[0.97]"
                      style={{
                        color: "#475569",
                        transition: "color 150ms ease, background-color 150ms ease, transform 150ms ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#c471ed"; e.currentTarget.style.backgroundColor = "rgba(196,113,237,0.08)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <IconExpand />
                    </button>
                  </div>

                  {/* Tab content */}
                  <div className="flex-1 overflow-hidden p-3 min-h-0">
                    {leftTab === "notes"      && <NotesPanel documentContent={doc.documentContent} filename={doc.filename} />}
                    {leftTab === "mindmap"    && <MindMap documentContent={doc.documentContent} onNodeClick={handleMindMapNodeClick} />}
                    {leftTab === "formulas"   && <FormulaExtractor documentContent={doc.documentContent} onExplain={handleFormulaExplain} />}
                    {leftTab === "flashcards" && <FlashcardDeck documentContent={doc.documentContent} filename={doc.filename} />}
                    {leftTab === "studyplan"  && <StudyPlan documentContent={doc.documentContent} />}
                    {leftTab === "dashboard"  && <ProgressDashboard />}
                  </div>
                </div>
              </div>

              {/* ── Chat panel ── */}
              <div
                className={`smb-panel w-full md:w-[380px] xl:w-[400px] shrink-0 flex flex-col ${mobileShowRight ? "flex" : "hidden md:flex"}`}
                {...bentoPanel}
              >
                {/* Chat header */}
                <div
                  className="flex items-center px-4 py-2.5 shrink-0"
                  style={{ borderBottom: "1px solid #1a1726" }}
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
                    <span style={{ color: "#c471ed" }}><IconChat /></span>
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
                      background: "rgba(196,113,237,0.08)",
                      border: "1px solid rgba(196,113,237,0.2)",
                      color: "#c471ed",
                      transition: "background-color 150ms ease, transform 150ms ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(196,113,237,0.14)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(196,113,237,0.08)"; }}
                  >
                    <IconQuiz />
                    Take Exam
                  </button>
                </div>

                {/* Chat panel */}
                <div className="flex-1 overflow-hidden min-h-0">
                  <ChatPanel
                    documentId={doc.id}
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
            </div>

            {/* Mobile toggle button */}
            <button
              onClick={() => setMobileShowRight(!mobileShowRight)}
              className="fixed bottom-4 right-4 md:hidden z-20 w-12 h-12 rounded-full flex items-center justify-center active:scale-[0.97]"
              style={{
                background: "#c471ed",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(196,113,237,0.4)",
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
                    background: leftTab === tab.id ? "rgba(196,113,237,0.08)" : "transparent",
                    border: leftTab === tab.id ? "1px solid rgba(196,113,237,0.25)" : "1px solid transparent",
                    color: leftTab === tab.id ? "#c471ed" : "#475569",
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
                e.currentTarget.style.color = "#c471ed";
                e.currentTarget.style.borderColor = "rgba(196,113,237,0.3)";
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
