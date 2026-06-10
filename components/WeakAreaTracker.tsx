"use client";

import { useEffect, useState } from "react";

export interface WeakArea {
  topic: string;
  wrongCount: number;
  correctInRow: number;
  lastSeen: string;
}

interface WeakAreaTrackerProps {
  documentContent: string;
  onRevise: (topic: string) => void;
  onRetryQuiz: (topic: string) => void;
}

export function loadWeakAreas(): WeakArea[] {
  try {
    return JSON.parse(localStorage.getItem("studymind_weak_areas") ?? "[]");
  } catch { return []; }
}

export function saveWeakAreas(areas: WeakArea[]) {
  localStorage.setItem("studymind_weak_areas", JSON.stringify(areas));
}

export default function WeakAreaTracker({ onRevise, onRetryQuiz }: WeakAreaTrackerProps) {
  const [areas, setAreas] = useState<WeakArea[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const refresh = () => setAreas(loadWeakAreas().filter((a) => a.correctInRow < 3));
    refresh();
    window.addEventListener("studymind_weak_areas_updated", refresh);
    return () => window.removeEventListener("studymind_weak_areas_updated", refresh);
  }, []);

  if (areas.length === 0) return null;

  const maxWrong = Math.max(...areas.map((a) => a.wrongCount), 1);

  return (
    <div className="border-t border-[rgba(245,200,66,0.08)] mt-auto shrink-0">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f87171]/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#f87171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-[#f87171] text-xs font-semibold uppercase tracking-widest">
            Weak Areas ({areas.length})
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-[#8892a4] transition-transform ${collapsed ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3 max-h-56 overflow-y-auto scrollbar-thin">
          {areas.map((area) => (
            <div key={area.topic} className="p-3 bg-[#f87171]/5 border border-[#f87171]/20 rounded-xl">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[#f0f4ff] text-xs font-semibold truncate">{area.topic}</p>
                  <p className="text-[#8892a4] text-xs mt-0.5">
                    {area.wrongCount} wrong · {area.correctInRow}/3 correct in a row
                  </p>
                </div>
              </div>

              {/* Weakness bar */}
              <div className="w-full bg-[#1a2340] rounded-full h-1.5 mb-2">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-[#f87171] to-[#ef4444] transition-all"
                  style={{ width: `${Math.min(100, (area.wrongCount / maxWrong) * 100)}%` }}
                />
              </div>

              {/* Correct in a row dots */}
              <div className="flex gap-1 mb-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full" style={{
                    background: i < area.correctInRow ? "#4ade80" : "#1a2340"
                  }} />
                ))}
                <span className="text-[#8892a4] text-xs ml-1">correct in a row</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onRevise(area.topic)}
                  className="flex-1 py-1.5 text-xs bg-[#4fc3f7]/10 border border-[#4fc3f7]/30 text-[#4fc3f7] rounded-lg hover:bg-[#4fc3f7]/20 transition-all font-medium"
                >
                  📖 Revise
                </button>
                <button
                  onClick={() => onRetryQuiz(area.topic)}
                  className="flex-1 py-1.5 text-xs bg-[#f5c842]/10 border border-[#f5c842]/30 text-[#f5c842] rounded-lg hover:bg-[#f5c842]/20 transition-all font-medium"
                >
                  🔄 Retry Quiz
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
