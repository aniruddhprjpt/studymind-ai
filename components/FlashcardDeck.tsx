"use client";

import { useState, useEffect, useCallback } from "react";

interface Flashcard {
  id: number | string;
  front: string;
  back: string;
}

interface Props {
  documentContent: string;
  filename: string;
}

const LS_KEY = "studymind_flashcards";
const LS_CUSTOM = "studymind_custom_flashcards";
const LS_MASTERED = "studymind_flashcards_mastered_count";

function loadDeck(docFilename: string): Flashcard[] | null {
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
    return d[docFilename] ?? null;
  } catch { return null; }
}

function saveDeck(docFilename: string, cards: Flashcard[]) {
  const d = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
  d[docFilename] = cards;
  localStorage.setItem(LS_KEY, JSON.stringify(d));
}

export default function FlashcardDeck({ documentContent, filename }: Props) {
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [mastered, setMastered] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customFront, setCustomFront] = useState("");
  const [customBack, setCustomBack] = useState("");
  const [reviewBuffer, setReviewBuffer] = useState<Flashcard[]>([]);

  const loadAndMerge = useCallback((cards: Flashcard[]) => {
    const custom: Flashcard[] = JSON.parse(localStorage.getItem(LS_CUSTOM) ?? "[]");
    const merged = [...cards, ...custom];
    setAllCards(merged);
    setQueue([...merged]);
    setMastered([]);
    setCurrentIdx(0);
    setFlipped(false);
  }, []);

  useEffect(() => {
    const stored = loadDeck(filename);
    if (stored) loadAndMerge(stored);

    const handleCustom = () => {
      const stored2 = loadDeck(filename);
      if (stored2) loadAndMerge(stored2);
    };
    window.addEventListener("studymind_flashcards_updated", handleCustom);
    return () => window.removeEventListener("studymind_flashcards_updated", handleCustom);
  }, [filename, loadAndMerge]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      saveDeck(filename, data.cards);
      loadAndMerge(data.cards);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate flashcards");
    } finally {
      setLoading(false);
    }
  };

  const shuffle = () => {
    const shuffled = [...queue].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setCurrentIdx(0);
    setFlipped(false);
  };

  const handleGotIt = () => {
    const card = queue[currentIdx];
    const newMastered = [...mastered, card];
    setMastered(newMastered);

    // Update mastered count in localStorage for dashboard
    const prev = parseInt(localStorage.getItem(LS_MASTERED) ?? "0", 10);
    localStorage.setItem(LS_MASTERED, String(prev + 1));

    // Insert review-again cards at +3 position
    const remaining = queue.filter((_, i) => i !== currentIdx);
    const withBuffer = [...remaining];
    reviewBuffer.forEach((rc, j) => {
      const pos = Math.min(3 + j, withBuffer.length);
      withBuffer.splice(pos, 0, rc);
    });
    setReviewBuffer([]);
    setQueue(withBuffer);
    setCurrentIdx(Math.min(currentIdx, withBuffer.length - 1));
    setFlipped(false);
  };

  const handleReviewAgain = () => {
    const card = queue[currentIdx];
    setReviewBuffer((prev) => [...prev, card]);

    const remaining = queue.filter((_, i) => i !== currentIdx);
    // Reinsert card 3 positions later
    const newQueue = [...remaining];
    newQueue.splice(Math.min(3, newQueue.length), 0, card);
    setQueue(newQueue);
    setCurrentIdx(Math.min(currentIdx, newQueue.length - 1));
    setFlipped(false);
  };

  const addCustomCard = () => {
    if (!customFront.trim() || !customBack.trim()) return;
    const card: Flashcard = { id: `custom_${Date.now()}`, front: customFront.trim(), back: customBack.trim() };
    const existing = JSON.parse(localStorage.getItem(LS_CUSTOM) ?? "[]");
    existing.push(card);
    localStorage.setItem(LS_CUSTOM, JSON.stringify(existing));
    setAllCards((p) => [...p, card]);
    setQueue((p) => [...p, card]);
    setCustomFront("");
    setCustomBack("");
    setShowCustom(false);
  };

  const resetDeck = () => {
    setQueue([...allCards]);
    setMastered([]);
    setCurrentIdx(0);
    setFlipped(false);
    setReviewBuffer([]);
  };

  // Loading / empty states
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-[#f5c842]/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[#f5c842] animate-spin" />
        </div>
        <p className="text-[#f5c842] font-semibold text-sm">Generating flashcards...</p>
      </div>
    );
  }

  if (allCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 py-10">
        <div className="text-5xl">🃏</div>
        <div className="text-center">
          <h3 className="text-[#f0f4ff] font-bold">Generate Flashcards</h3>
          <p className="text-[#8892a4] text-sm mt-1 max-w-xs leading-relaxed">
            AI creates 15 study cards from your document with spaced repetition.
          </p>
        </div>
        {error && <p className="text-[#f87171] text-sm text-center">{error}</p>}
        <button
          onClick={generate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#f5c842] text-[#0a0f1e] rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(245,200,66,0.25)] hover:bg-[#ffd84d] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generate Cards
        </button>
      </div>
    );
  }

  // Deck complete
  if (queue.length === 0 || currentIdx >= queue.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
        <div className="text-5xl">🎉</div>
        <div>
          <h3 className="text-[#f0f4ff] font-bold text-lg">Deck Complete!</h3>
          <p className="text-[#8892a4] text-sm mt-1">
            <span className="text-[#4ade80] font-bold">{mastered.length}</span> mastered ·{" "}
            <span className="text-[#f5c842] font-bold">{allCards.length - mastered.length}</span> remaining
          </p>
        </div>
        <div className="w-full max-w-xs bg-[#1a2340] rounded-full h-2">
          <div className="h-2 bg-[#4ade80] rounded-full" style={{ width: `${(mastered.length / allCards.length) * 100}%` }} />
        </div>
        <button onClick={resetDeck} className="px-5 py-2.5 bg-[#f5c842] text-[#0a0f1e] rounded-xl font-bold text-sm hover:bg-[#ffd84d] transition-all">
          Restart Deck
        </button>
        <button onClick={generate} className="text-[#8892a4] text-xs underline">Regenerate cards</button>
      </div>
    );
  }

  const card = queue[currentIdx];
  const progressPct = (mastered.length / allCards.length) * 100;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Progress */}
      <div className="shrink-0 space-y-1.5">
        <div className="flex justify-between text-xs text-[#8892a4]">
          <span>Card {currentIdx + 1} of {queue.length} remaining</span>
          <span>✓ {mastered.length}/{allCards.length} mastered</span>
        </div>
        <div className="w-full bg-[#1a2340] rounded-full h-1.5">
          <div className="h-1.5 bg-[#4ade80] rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center" style={{ perspective: "1000px" }}>
        <div
          onClick={() => setFlipped(!flipped)}
          className="w-full max-w-xs cursor-pointer"
          style={{ transformStyle: "preserve-3d", transition: "transform 0.5s ease", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", height: "200px", position: "relative" }}
        >
          {/* Front */}
          <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 text-center border"
            style={{ backfaceVisibility: "hidden", background: "linear-gradient(135deg, #f5c842, #e0a800)", borderColor: "#f5c842" }}>
            <p className="text-[#0a0f1e] font-bold text-base leading-relaxed">{card.front}</p>
            <p className="text-[#0a0f1e]/50 text-xs mt-3 font-medium">Tap to reveal</p>
          </div>
          {/* Back */}
          <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 text-center border"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "#0d1526", borderColor: "rgba(79,195,247,0.3)" }}>
            <p className="text-[#4fc3f7] text-sm leading-relaxed">{card.back}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 space-y-2">
        {flipped ? (
          <div className="flex gap-3">
            <button
              onClick={handleReviewAgain}
              className="flex-1 py-3 bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171] rounded-xl font-bold text-sm hover:bg-[#f87171]/20 transition-all"
            >
              ✗ Review Again
            </button>
            <button
              onClick={handleGotIt}
              className="flex-1 py-3 bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80] rounded-xl font-bold text-sm hover:bg-[#4ade80]/20 transition-all"
            >
              ✓ Got It!
            </button>
          </div>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="w-full py-3 bg-[#f5c842]/10 border border-[#f5c842]/30 text-[#f5c842] rounded-xl font-bold text-sm hover:bg-[#f5c842]/20 transition-all"
          >
            Reveal Answer
          </button>
        )}

        <div className="flex gap-2">
          <button onClick={shuffle} className="flex-1 py-2 bg-[#1a2340] border border-[rgba(245,200,66,0.15)] text-[#8892a4] rounded-xl text-xs hover:text-[#f0f4ff] hover:border-[#f5c842]/30 transition-all">
            🔀 Shuffle
          </button>
          <button onClick={() => setShowCustom(!showCustom)} className="flex-1 py-2 bg-[#1a2340] border border-[rgba(245,200,66,0.15)] text-[#8892a4] rounded-xl text-xs hover:text-[#f0f4ff] hover:border-[#f5c842]/30 transition-all">
            ✏️ Add Card
          </button>
          <button onClick={resetDeck} className="flex-1 py-2 bg-[#1a2340] border border-[rgba(245,200,66,0.15)] text-[#8892a4] rounded-xl text-xs hover:text-[#f0f4ff] hover:border-[#f5c842]/30 transition-all">
            🔁 Reset
          </button>
        </div>

        {/* Custom card form */}
        {showCustom && (
          <div className="p-3 bg-[#0d1526] border border-[rgba(245,200,66,0.15)] rounded-xl space-y-2">
            <input
              value={customFront} onChange={(e) => setCustomFront(e.target.value)}
              placeholder="Front (question or term)"
              className="w-full bg-[#1a2340] border border-[rgba(245,200,66,0.15)] rounded-lg px-3 py-2 text-[#f0f4ff] text-xs placeholder-[#8892a4] focus:outline-none focus:border-[#f5c842]"
            />
            <textarea
              value={customBack} onChange={(e) => setCustomBack(e.target.value)}
              placeholder="Back (answer or definition)"
              rows={2}
              className="w-full bg-[#1a2340] border border-[rgba(245,200,66,0.15)] rounded-lg px-3 py-2 text-[#f0f4ff] text-xs placeholder-[#8892a4] focus:outline-none focus:border-[#f5c842] resize-none"
            />
            <button
              onClick={addCustomCard}
              disabled={!customFront.trim() || !customBack.trim()}
              className="w-full py-2 bg-[#f5c842] text-[#0a0f1e] rounded-lg font-bold text-xs disabled:opacity-40 hover:bg-[#ffd84d] transition-all"
            >
              Add to Deck
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
