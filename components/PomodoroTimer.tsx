"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const WORK_MINS = 25;
const SHORT_BREAK = 5;
const LONG_BREAK = 15;
const SESSIONS_BEFORE_LONG = 4;
const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Phase = "work" | "short_break" | "long_break";

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 523.25; // C5
    osc.type = "sine";
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.2);
  } catch { /* audio may be blocked */ }
}

function getTodayKey() {
  return "studymind_pomodoro_" + new Date().toISOString().split("T")[0];
}

export default function PomodoroTimer({ focusMode, onFocusToggle }: {
  focusMode: boolean;
  onFocusToggle: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("work");
  const [timeLeft, setTimeLeft] = useState(WORK_MINS * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0); // work sessions done today
  const [completedToday, setCompletedToday] = useState(0);
  const [open, setOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalTime = phase === "work" ? WORK_MINS * 60
    : phase === "short_break" ? SHORT_BREAK * 60
    : LONG_BREAK * 60;

  const progress = timeLeft / totalTime;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  // Load today's sessions from localStorage
  useEffect(() => {
    const stored = parseInt(localStorage.getItem(getTodayKey()) ?? "0", 10);
    setCompletedToday(stored);
  }, []);

  const advancePhase = useCallback(() => {
    playChime();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("StudyMind AI", {
        body: phase === "work" ? "🍅 Work session done! Take a break." : "⏰ Break over! Back to work.",
        icon: "/favicon.ico",
      });
    }

    if (phase === "work") {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      const newTotal = completedToday + 1;
      setCompletedToday(newTotal);
      localStorage.setItem(getTodayKey(), String(newTotal));

      // Update streak/study time in dashboard storage
      const timeData = JSON.parse(localStorage.getItem("studymind_study_time") ?? "{}");
      const todayKey = new Date().toISOString().split("T")[0];
      timeData[todayKey] = (timeData[todayKey] ?? 0) + WORK_MINS;
      localStorage.setItem("studymind_study_time", JSON.stringify(timeData));

      if (newCount % SESSIONS_BEFORE_LONG === 0) {
        setPhase("long_break");
        setTimeLeft(LONG_BREAK * 60);
      } else {
        setPhase("short_break");
        setTimeLeft(SHORT_BREAK * 60);
      }
    } else {
      setPhase("work");
      setTimeLeft(WORK_MINS * 60);
    }
    setIsRunning(false);
  }, [phase, sessionCount, completedToday]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current!);
            advancePhase();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, advancePhase]);

  const reset = () => {
    setIsRunning(false);
    setPhase("work");
    setTimeLeft(WORK_MINS * 60);
  };

  const requestNotificationPermission = () => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  const phaseColor = phase === "work" ? "#f5c842" : "#4fc3f7";
  const phaseLabel = phase === "work" ? "Focus" : phase === "short_break" ? "Short Break" : "Long Break";

  return (
    <div className="relative">
      {/* Compact nav widget */}
      <button
        onClick={() => { setOpen(!open); requestNotificationPermission(); }}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#111827] border border-[rgba(245,200,66,0.2)] rounded-lg hover:border-[#f5c842]/40 transition-all"
      >
        <svg width="20" height="20" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#1a2340" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={RADIUS} fill="none"
            stroke={phaseColor} strokeWidth="8"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <span className="text-[#f0f4ff] text-xs font-mono font-bold">{mins}:{secs}</span>
        <span className="text-[#8892a4] text-xs">🍅×{completedToday}</span>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 bg-[#111827] border border-[rgba(245,200,66,0.2)] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] p-5">
          {/* Phase label */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: phaseColor }}>
              {phaseLabel}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: SESSIONS_BEFORE_LONG }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full" style={{
                  background: i < (sessionCount % SESSIONS_BEFORE_LONG) ? "#f5c842" : "#1a2340"
                }} />
              ))}
            </div>
          </div>

          {/* Big circular timer */}
          <div className="flex justify-center mb-5">
            <div className="relative w-32 h-32">
              <svg width="128" height="128" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#1a2340" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r={RADIUS} fill="none"
                  stroke={phaseColor} strokeWidth="8"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[#f0f4ff] text-2xl font-black font-mono">{mins}:{secs}</span>
                <span className="text-[#8892a4] text-xs mt-0.5">{phaseLabel}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2 justify-center mb-4">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm transition-all"
              style={{ background: phaseColor, color: "#0a0f1e" }}
            >
              {isRunning ? (
                <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" /></svg>Pause</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>{timeLeft === totalTime ? "Start" : "Resume"}</>
              )}
            </button>
            <button
              onClick={reset}
              className="px-3 py-2 bg-[#1a2340] border border-[rgba(245,200,66,0.2)] text-[#8892a4] rounded-lg text-sm hover:text-[#f0f4ff] hover:border-[#f5c842]/40 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onFocusToggle}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                focusMode
                  ? "bg-[#f5c842]/20 border-[#f5c842] text-[#f5c842]"
                  : "bg-[#1a2340] border-[rgba(245,200,66,0.2)] text-[#8892a4] hover:border-[#f5c842]/40"
              }`}
            >
              {focusMode ? "Exit Focus" : "🎯 Focus"}
            </button>
          </div>

          {/* Stats */}
          <div className="flex justify-between text-xs text-[#8892a4] border-t border-[rgba(245,200,66,0.08)] pt-3">
            <span>🍅 Today: <span className="text-[#f5c842] font-bold">{completedToday}</span></span>
            <span>Session: <span className="text-[#f5c842] font-bold">{(sessionCount % SESSIONS_BEFORE_LONG) + 1}/{SESSIONS_BEFORE_LONG}</span></span>
            <span>⏱ {completedToday * WORK_MINS}m focused</span>
          </div>
        </div>
      )}
    </div>
  );
}
