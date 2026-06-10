"use client";

import { useState, useEffect } from "react";

interface PlanActivity { type: string; description: string; }
interface PlanDay {
  day: number; date: string; focus: string;
  topics: string[]; activities: PlanActivity[]; estimatedMinutes: number;
}
interface StudyPlanData { plan: PlanDay[]; examName: string; examDate: string; }

const LS_KEY = "studymind_study_plan";
const LS_COMPLETED = "studymind_plan_completed";
const LS_EXAM = "studymind_exam";

const ACT_ICONS: Record<string, string> = {
  read: "📖", flashcards: "🃏", quiz: "📝", notes: "✏️", review: "🔁", practice: "💪",
};

export default function StudyPlan({ documentContent }: { documentContent: string }) {
  const [planData, setPlanData] = useState<StudyPlanData | null>(null);
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<{ name: string; date: string } | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  useEffect(() => {
    try {
      const ex = localStorage.getItem(LS_EXAM);
      if (ex) setExam(JSON.parse(ex));
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setPlanData(JSON.parse(stored));
      const done: number[] = JSON.parse(localStorage.getItem(LS_COMPLETED) ?? "[]");
      setCompletedDays(new Set(done));
    } catch { /* ignore */ }
  }, []);

  const generate = async () => {
    if (!exam) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/studyplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentContent, examName: exam.name, examDate: exam.date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const saved: StudyPlanData = { plan: data.plan, examName: exam.name, examDate: exam.date };
      localStorage.setItem(LS_KEY, JSON.stringify(saved));
      localStorage.setItem(LS_COMPLETED, "[]");
      setPlanData(saved); setCompletedDays(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate plan");
    } finally { setLoading(false); }
  };

  const toggleDay = (dayNum: number) => {
    setCompletedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNum)) next.delete(dayNum); else next.add(dayNum);
      localStorage.setItem(LS_COMPLETED, JSON.stringify([...next]));
      return next;
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-[#f5c842]/20" />
        <div className="absolute inset-0 rounded-full border-2 border-t-[#f5c842] animate-spin" />
      </div>
      <p className="text-[#f5c842] text-sm font-semibold">Building study plan...</p>
    </div>
  );

  if (!exam) return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-6">
      <div className="text-5xl">📅</div>
      <h3 className="text-[#f0f4ff] font-bold">Set Your Exam Date First</h3>
      <p className="text-[#8892a4] text-sm leading-relaxed">
        Click <span className="text-[#f5c842] font-semibold">Set Exam Date</span> in the top bar, then return here.
      </p>
    </div>
  );

  if (!planData) return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
      <div className="text-5xl">🗓️</div>
      <div>
        <h3 className="text-[#f0f4ff] font-bold">Generate Study Plan</h3>
        <p className="text-[#8892a4] text-sm mt-1 max-w-xs leading-relaxed">
          AI creates a day-by-day schedule for your <span className="text-[#f5c842]">{exam.name}</span> exam.
        </p>
      </div>
      {error && <p className="text-[#f87171] text-sm">{error}</p>}
      <button onClick={generate} className="flex items-center gap-2 px-5 py-2.5 bg-[#f5c842] text-[#0a0f1e] rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(245,200,66,0.25)] hover:bg-[#ffd84d] transition-all">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        Generate Plan
      </button>
    </div>
  );

  const { plan, examName } = planData;
  const pct = (completedDays.size / plan.length) * 100;

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="shrink-0 p-3 bg-[#0d1526] border border-[rgba(245,200,66,0.15)] rounded-xl">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#f5c842] text-xs font-semibold uppercase tracking-widest">{examName}</span>
          <button onClick={generate} className="text-[#8892a4] text-xs hover:text-[#f0f4ff] underline">Regenerate</button>
        </div>
        <div className="flex justify-between text-xs text-[#8892a4] mb-1">
          <span>{completedDays.size}/{plan.length} days done</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="w-full bg-[#1a2340] rounded-full h-1.5">
          <div className="h-1.5 bg-gradient-to-r from-[#f5c842] to-[#4fc3f7] rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
        {plan.map((day) => {
          const done = completedDays.has(day.day);
          const exp = expandedDay === day.day;
          return (
            <div key={day.day} className={`border rounded-xl overflow-hidden transition-all ${done ? "border-[#4ade80]/30 bg-[#4ade80]/5" : "border-[rgba(245,200,66,0.12)] bg-[#0d1526]"}`}>
              <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer" onClick={() => setExpandedDay(exp ? null : day.day)}>
                <button onClick={(e) => { e.stopPropagation(); toggleDay(day.day); }}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${done ? "bg-[#4ade80] border-[#4ade80]" : "border-[#8892a4] hover:border-[#f5c842]"}`}>
                  {done && <svg className="w-3 h-3 text-[#0a0f1e]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2"><span className="text-[#f5c842] text-xs font-bold font-mono">Day {day.day}</span><span className="text-[#8892a4] text-xs">{new Date(day.date).toLocaleDateString("en",{weekday:"short",month:"short",day:"numeric"})}</span></div>
                  <p className="text-[#f0f4ff] text-xs font-medium truncate">{day.focus}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[#8892a4] text-xs">{day.estimatedMinutes}m</span>
                  <svg className={`w-3.5 h-3.5 text-[#8892a4] transition-transform ${exp ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              {exp && (
                <div className="px-3 pb-3 border-t border-[rgba(245,200,66,0.08)]">
                  <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                    {day.topics.map((t) => <span key={t} className="text-xs px-2 py-0.5 bg-[#f5c842]/10 border border-[#f5c842]/20 text-[#f5c842] rounded-full">{t}</span>)}
                  </div>
                  <div className="space-y-1.5">
                    {day.activities.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="shrink-0">{ACT_ICONS[a.type] ?? "▸"}</span>
                        <p className="text-[#8892a4] leading-relaxed">{a.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
