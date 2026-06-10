"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface ExamData {
  name: string;
  date: string;
}

export default function ExamCountdown() {
  const [exam, setExam] = useState<ExamData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", date: "" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("studymind_exam");
      if (stored) setExam(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Pre-fill form when opening modal
  const openModal = () => {
    setForm({ name: exam?.name ?? "", date: exam?.date ?? "" });
    setShowModal(true);
  };

  // Escape key closes modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowModal(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const daysLeft = exam
    ? Math.ceil((new Date(exam.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const urgencyColor =
    daysLeft === null ? "#4fc3f7"
    : daysLeft <= 3  ? "#f87171"
    : daysLeft <= 7  ? "#fb923c"
    : "#4fc3f7";

  const saveExam = () => {
    if (!form.name.trim() || !form.date) return;
    const data: ExamData = { name: form.name.trim(), date: form.date };
    localStorage.setItem("studymind_exam", JSON.stringify(data));
    setExam(data);
    setShowModal(false);
  };

  const clearExam = () => {
    localStorage.removeItem("studymind_exam");
    setExam(null);
    setShowModal(false);
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={() => setShowModal(false)} />

      <div className="relative w-full max-w-sm bg-[#111827] border border-[rgba(245,200,66,0.25)] rounded-2xl shadow-[0_0_60px_rgba(245,200,66,0.15)] overflow-hidden">
        {/* Gold top accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#f5c842] via-[#ffd84d] to-[#4fc3f7]" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#f5c842]/10 border border-[#f5c842]/30 flex items-center justify-center text-base">
                📅
              </div>
              <h3 className="text-[#f0f4ff] font-bold text-lg">Set Exam Date</h3>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-8 h-8 rounded-lg bg-[#1a2340] hover:bg-[#f87171]/20 border border-transparent hover:border-[#f87171]/30 flex items-center justify-center text-[#8892a4] hover:text-[#f87171] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-[#f5c842] text-xs font-semibold uppercase tracking-widest block mb-1.5">
                Exam / Subject Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") saveExam(); }}
                placeholder="e.g. Mathematics Final"
                autoFocus
                className="w-full bg-[#0d1526] border border-[rgba(245,200,66,0.2)] rounded-xl px-4 py-3 text-[#f0f4ff] text-sm placeholder-[#8892a4] focus:outline-none focus:border-[#f5c842] transition-colors"
              />
            </div>
            <div>
              <label className="text-[#f5c842] text-xs font-semibold uppercase tracking-widest block mb-1.5">
                Exam Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-[#0d1526] border border-[rgba(245,200,66,0.2)] rounded-xl px-4 py-3 text-[#f0f4ff] text-sm focus:outline-none focus:border-[#f5c842] transition-colors"
              />
            </div>
          </div>

          {/* Countdown preview */}
          {form.date && (() => {
            const d = Math.ceil((new Date(form.date).getTime() - Date.now()) / 86400000);
            if (isNaN(d)) return null;
            const col = d <= 3 ? "#f87171" : d <= 7 ? "#fb923c" : "#4ade80";
            return (
              <div className="mt-4 px-4 py-3 rounded-xl border text-center" style={{ borderColor: col + "40", background: col + "10" }}>
                <p className="font-bold text-sm" style={{ color: col }}>
                  {d > 0 ? `${d} day${d !== 1 ? "s" : ""} to go` : d === 0 ? "Exam is today! 🎯" : "Date is in the past"}
                </p>
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex gap-2 mt-5">
            <button
              onClick={saveExam}
              disabled={!form.name.trim() || !form.date}
              className="flex-1 py-2.5 bg-[#f5c842] text-[#0a0f1e] rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ffd84d] transition-all shadow-[0_0_20px_rgba(245,200,66,0.2)]"
            >
              Save Exam
            </button>
            {exam && (
              <button
                onClick={clearExam}
                className="px-4 py-2.5 bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171] rounded-xl text-sm hover:bg-[#f87171]/20 transition-all"
              >
                Clear
              </button>
            )}
          </div>

          <p className="text-center text-[#8892a4] text-xs mt-4">
            Press <kbd className="px-1.5 py-0.5 bg-[#0d1526] border border-[rgba(245,200,66,0.15)] rounded font-mono text-[10px]">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#111827] border rounded-lg transition-all hover:opacity-90 text-xs font-semibold"
        style={{ borderColor: urgencyColor + "40", color: urgencyColor }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {exam && daysLeft !== null ? (
          <span>
            📅 {exam.name} —{" "}
            {daysLeft > 0
              ? <span style={{ color: urgencyColor }}>{daysLeft}d left</span>
              : <span className="text-[#f87171]">Today!</span>
            }
          </span>
        ) : (
          <span>Set Exam Date</span>
        )}
      </button>

      {/* Render modal into document.body to escape header stacking context */}
      {mounted && showModal && createPortal(modal, document.body)}
    </>
  );
}
