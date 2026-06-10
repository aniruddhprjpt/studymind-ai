"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface QuizScore { date: string; percentage: number; score: number; total: number; }
interface WeakArea { topic: string; wrongCount: number; correctInRow: number; }

function StatCard({ label, value, icon, color = "#f5c842" }: {
  label: string; value: string | number; icon: string; color?: string;
}) {
  return (
    <div className="bg-[#0d1526] border border-[rgba(245,200,66,0.12)] rounded-xl p-4 flex items-center gap-3">
      <div className="text-2xl">{icon}</div>
      <div>
        <p className="font-black text-xl" style={{ color }}>{value}</p>
        <p className="text-[#8892a4] text-xs">{label}</p>
      </div>
    </div>
  );
}

function getStreak(): { count: number; lastDate: string } {
  try {
    return JSON.parse(localStorage.getItem("studymind_streak") ?? '{"count":0,"lastDate":""}');
  } catch { return { count: 0, lastDate: "" }; }
}

function updateStreak() {
  const today = new Date().toISOString().split("T")[0];
  const streak = getStreak();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  let count = streak.count;
  if (streak.lastDate === today) return count;
  if (streak.lastDate === yesterday) count += 1;
  else count = 1;
  localStorage.setItem("studymind_streak", JSON.stringify({ count, lastDate: today }));
  return count;
}

function motivationalMessage(streak: number) {
  if (streak >= 30) return { msg: "Legend status unlocked 🏆", color: "#f5c842" };
  if (streak >= 7) return { msg: "One week strong! You're unstoppable 🚀", color: "#4fc3f7" };
  if (streak >= 3) return { msg: "Great start! Keep it up 🔥", color: "#fb923c" };
  return { msg: "Start your streak today! 💪", color: "#8892a4" };
}

const POMO_DAY_KEY = () => "studymind_pomodoro_" + new Date().toISOString().split("T")[0];

export default function ProgressDashboard() {
  const [quizScores, setQuizScores] = useState<QuizScore[]>([]);
  const [docsStudied, setDocsStudied] = useState(0);
  const [pomodoroToday, setPomodoroToday] = useState(0);
  const [flashMastered, setFlashMastered] = useState(0);
  const [streak, setStreak] = useState(0);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);

  useEffect(() => {
    try {
      setQuizScores(JSON.parse(localStorage.getItem("studymind_quiz_scores") ?? "[]"));
      setDocsStudied(parseInt(localStorage.getItem("studymind_docs_count") ?? "0", 10));
      setPomodoroToday(parseInt(localStorage.getItem(POMO_DAY_KEY()) ?? "0", 10));
      setFlashMastered(parseInt(localStorage.getItem("studymind_flashcards_mastered_count") ?? "0", 10));
      setWeakAreas(JSON.parse(localStorage.getItem("studymind_weak_areas") ?? "[]"));
      const s = updateStreak();
      setStreak(s);
    } catch { /* ignore */ }
  }, []);

  const { msg: streakMsg, color: streakColor } = motivationalMessage(streak);

  // Pie data: mastered vs weak
  const masteredCount = weakAreas.filter((w) => w.correctInRow >= 3).length;
  const struggleCount = weakAreas.filter((w) => w.correctInRow < 3 && w.wrongCount > 0).length;
  const pieData = [
    { name: "Mastered", value: Math.max(masteredCount, flashMastered > 0 ? 1 : 0) },
    { name: "Struggling", value: Math.max(struggleCount, 1) },
  ];
  const PIE_COLORS = ["#4ade80", "#f87171"];

  const avgScore = quizScores.length > 0
    ? Math.round(quizScores.reduce((s, q) => s + q.percentage, 0) / quizScores.length)
    : 0;

  const totalStudyMins = (() => {
    try {
      const d = JSON.parse(localStorage.getItem("studymind_study_time") ?? "{}");
      return Object.values(d as Record<string, number>).reduce((a, b) => a + b, 0);
    } catch { return 0; }
  })();

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto scrollbar-thin pb-4">
      {/* Streak banner */}
      <div className="p-3 rounded-xl border" style={{ borderColor: streakColor + "40", background: streakColor + "10" }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{streak >= 7 ? "🔥" : streak >= 3 ? "🌟" : "⚡"}</span>
          <div>
            <p className="font-bold text-sm" style={{ color: streakColor }}>{streak} day streak</p>
            <p className="text-xs text-[#8892a4]">{streakMsg}</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Docs Studied" value={docsStudied} icon="📚" />
        <StatCard label="Study Time" value={`${totalStudyMins}m`} icon="⏱️" color="#4fc3f7" />
        <StatCard label="Avg Quiz Score" value={`${avgScore}%`} icon="🎯" color={avgScore >= 80 ? "#4ade80" : avgScore >= 60 ? "#f5c842" : "#f87171"} />
        <StatCard label="Cards Mastered" value={flashMastered} icon="🃏" color="#4ade80" />
      </div>

      {/* Quiz scores line chart */}
      {quizScores.length > 0 && (
        <div className="bg-[#0d1526] border border-[rgba(245,200,66,0.12)] rounded-xl p-4">
          <p className="text-[#f5c842] text-xs font-semibold uppercase tracking-widest mb-3">📊 Quiz Scores Over Time</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={quizScores.slice(-10)}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#8892a4" }} tickFormatter={(d) => d.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#8892a4" }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid rgba(245,200,66,0.2)", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "#f5c842" }}
                formatter={(v) => [`${v ?? 0}%`, "Score"]}
              />
              <Line type="monotone" dataKey="percentage" stroke="#f5c842" strokeWidth={2} dot={{ fill: "#f5c842", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Topics pie chart */}
      <div className="bg-[#0d1526] border border-[rgba(245,200,66,0.12)] rounded-xl p-4">
        <p className="text-[#f5c842] text-xs font-semibold uppercase tracking-widest mb-3">🎯 Mastered vs Struggling</p>
        <ResponsiveContainer width="100%" height={130}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={3}>
              {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx]} />)}
            </Pie>
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#8892a4" }} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(245,200,66,0.2)", borderRadius: 8, fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Pomodoro today */}
      <div className="bg-[#0d1526] border border-[rgba(245,200,66,0.12)] rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[#f5c842] text-xs font-semibold uppercase tracking-widest">Today&apos;s Sessions</p>
          <p className="text-[#f0f4ff] font-black text-2xl mt-1">{"🍅".repeat(Math.min(pomodoroToday, 8))}</p>
          <p className="text-[#8892a4] text-xs">{pomodoroToday} Pomodoro{pomodoroToday !== 1 ? "s" : ""} · {pomodoroToday * 25} minutes</p>
        </div>
        <div className="text-4xl opacity-20">🍅</div>
      </div>
    </div>
  );
}
