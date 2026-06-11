"use client";

import { useState, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";

interface QuizQuestion {
  id: number;
  type: "mcq" | "truefalse" | "shortanswer";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topic?: string;
}

interface QuizModalProps {
  documentContent: string;
  onClose: () => void;
  topicFilter?: string;
}

type Phase = "loading" | "quiz" | "results";

interface WeakAreaEntry {
  topic: string;
  wrongCount: number;
  correctInRow: number;
  lastSeen: string;
}

function checkIsCorrect(q: QuizQuestion, userAns: string): boolean {
  const ua = userAns.trim().toLowerCase();
  const ca = q.correctAnswer.trim().toLowerCase();
  if (q.type === "shortanswer") {
    const words = ca.split(/\s+/).filter((w) => w.length > 3);
    const matchCount = words.filter((w) => ua.includes(w)).length;
    return matchCount >= Math.ceil(words.length * 0.5);
  }
  return ua === ca || ua.startsWith(ca.charAt(0).toLowerCase());
}

export default function QuizModal({ documentContent, onClose, topicFilter }: QuizModalProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortAnswerInput, setShortAnswerInput] = useState("");

  const fetchQuiz = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentContent, topicFilter }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
      setAnswers({});
      setCurrentQ(0);
      setSubmitted(false);
      setPhase("quiz");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
      setPhase("quiz");
    }
  }, [documentContent]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const currentQuestion = questions[currentQ];

  const handleAnswer = (answer: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));
    if (currentQuestion.type !== "shortanswer") {
      setShortAnswerInput("");
    }
  };

  const handleShortAnswerSubmit = () => {
    if (!shortAnswerInput.trim()) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: shortAnswerInput.trim() }));
  };

  const goNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((c) => c + 1);
      setShortAnswerInput("");
    }
  };

  const goPrev = () => {
    if (currentQ > 0) {
      setCurrentQ((c) => c - 1);
      setShortAnswerInput("");
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q) => {
      const userAnswer = (answers[q.id] ?? "").trim().toLowerCase();
      const correctAnswer = q.correctAnswer.trim().toLowerCase();
      if (q.type === "shortanswer") {
        // partial match for short answers
        const words = correctAnswer.split(/\s+/).filter((w) => w.length > 3);
        const matchCount = words.filter((w) => userAnswer.includes(w)).length;
        if (matchCount >= Math.ceil(words.length * 0.5)) correct++;
      } else {
        if (userAnswer === correctAnswer.toLowerCase() ||
            userAnswer.startsWith(correctAnswer.charAt(0).toLowerCase())) {
          correct++;
        }
      }
    });
    return correct;
  };

  const submitQuiz = () => {
    setSubmitted(true);
    setPhase("results");
    const score = calculateScore();
    const pct = Math.round((score / questions.length) * 100);

    // Save quiz score to localStorage for Progress Dashboard
    try {
      const scores = JSON.parse(localStorage.getItem("studymind_quiz_scores") ?? "[]");
      scores.push({
        date: new Date().toISOString().split("T")[0],
        percentage: pct,
        score,
        total: questions.length,
      });
      localStorage.setItem("studymind_quiz_scores", JSON.stringify(scores.slice(-50)));
    } catch { /* ignore */ }

    // Update weak areas in localStorage for Weak Area Tracker
    try {
      const existing: WeakAreaEntry[] = JSON.parse(localStorage.getItem("studymind_weak_areas") ?? "[]");
      const map = new Map(existing.map((a) => [a.topic, { ...a }]));

      questions.forEach((q) => {
        const topic = q.topic ?? q.question.slice(0, 60);
        const isCorrect = checkIsCorrect(q, answers[q.id] ?? "");
        const area: WeakAreaEntry = map.get(topic) ?? {
          topic, wrongCount: 0, correctInRow: 0, lastSeen: "",
        };
        if (isCorrect) {
          area.correctInRow = (area.correctInRow ?? 0) + 1;
        } else {
          area.wrongCount += 1;
          area.correctInRow = 0;
        }
        area.lastSeen = new Date().toISOString().split("T")[0];
        map.set(topic, area);
      });

      // Keep only topics not yet fully mastered (< 3 correct in a row)
      const updated = [...map.values()].filter((a) => a.correctInRow < 3);
      localStorage.setItem("studymind_weak_areas", JSON.stringify(updated));
      window.dispatchEvent(new Event("studymind_weak_areas_updated"));
    } catch { /* ignore */ }

    if (pct >= 80) {
      setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 80,
          colors: ["#c471ed", "#4fc3f7", "#ffffff"],
          origin: { y: 0.6 },
        });
      }, 300);
    }
  };

  const getWeakAreas = () => {
    return questions.filter((q) => {
      const userAnswer = (answers[q.id] ?? "").trim().toLowerCase();
      const correctAnswer = q.correctAnswer.trim().toLowerCase();
      if (q.type === "shortanswer") {
        const words = correctAnswer.split(/\s+/).filter((w) => w.length > 3);
        const matchCount = words.filter((w) => userAnswer.includes(w)).length;
        return matchCount < Math.ceil(words.length * 0.5);
      }
      return !(userAnswer === correctAnswer.toLowerCase() ||
        userAnswer.startsWith(correctAnswer.charAt(0).toLowerCase()));
    });
  };

  const score = submitted ? calculateScore() : 0;
  const percentage = submitted ? Math.round((score / questions.length) * 100) : 0;
  const weakAreas = submitted ? getWeakAreas() : [];

  const isAnswered = (qId: number) => !!answers[qId];
  const answeredCount = questions.filter((q) => isAnswered(q.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0d1526] border border-[rgba(196,113,237,0.2)] rounded-2xl shadow-[0_0_60px_rgba(196,113,237,0.1)] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(196,113,237,0.1)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#c471ed]/10 border border-[#c471ed]/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#c471ed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-[#f0f4ff] font-bold text-lg">Mock Exam</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1a2340] hover:bg-[#f87171]/20 border border-transparent hover:border-[#f87171]/30 flex items-center justify-center text-[#8892a4] hover:text-[#f87171] transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Loading */}
          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-[#c471ed]/20" />
                <div className="absolute inset-0 rounded-full border-2 border-t-[#c471ed] animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-[#c471ed] font-semibold">Generating your exam...</p>
                <p className="text-[#8892a4] text-sm mt-1">Creating questions from your document</p>
              </div>
              <div className="flex gap-2">
                {["MCQ", "True/False", "Short Answer"].map((t) => (
                  <span key={t} className="skeleton-shimmer px-3 py-1 rounded-full text-xs text-transparent bg-[#1a2340]">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {phase === "quiz" && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 px-6">
              <div className="w-12 h-12 rounded-full bg-[#f87171]/10 border border-[#f87171]/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#f87171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[#f87171] text-center">{error}</p>
              <button onClick={fetchQuiz} className="px-4 py-2 bg-[#c471ed] text-[#fff] rounded-lg font-semibold text-sm hover:bg-[#d08cf0] transition-colors">
                Try Again
              </button>
            </div>
          )}

          {/* Quiz */}
          {phase === "quiz" && !error && questions.length > 0 && (
            <div className="p-6 space-y-6">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-[#8892a4]">
                  <span>Question {currentQ + 1} of {questions.length}</span>
                  <span>{answeredCount} answered</span>
                </div>
                <div className="w-full bg-[#1a2340] rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-[#c471ed] to-[#4fc3f7] h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                  />
                </div>
                {/* Question dots */}
                <div className="flex gap-1.5 justify-center flex-wrap">
                  {questions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentQ(i)}
                      className={`w-6 h-6 rounded-full text-xs font-bold transition-all duration-200 ${
                        i === currentQ
                          ? "bg-[#c471ed] text-[#fff] scale-110"
                          : isAnswered(q.id)
                          ? "bg-[#4ade80]/20 border border-[#4ade80]/50 text-[#4ade80]"
                          : "bg-[#1a2340] text-[#8892a4] hover:bg-[#253050]"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question */}
              {currentQuestion && (
                <div className="animate-fadeSlideUp">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide border ${
                      currentQuestion.type === "mcq"
                        ? "bg-[#4fc3f7]/10 text-[#4fc3f7] border-[#4fc3f7]/30"
                        : currentQuestion.type === "truefalse"
                        ? "bg-[#c471ed]/10 text-[#c471ed] border-[#c471ed]/30"
                        : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                    }`}>
                      {currentQuestion.type === "mcq" ? "Multiple Choice" :
                       currentQuestion.type === "truefalse" ? "True / False" : "Short Answer"}
                    </span>
                  </div>

                  <p className="text-[#f0f4ff] text-base font-medium leading-relaxed mb-4">
                    {currentQuestion.question}
                  </p>

                  {/* Options */}
                  <div className="space-y-2">
                    {currentQuestion.type !== "shortanswer" ? (
                      currentQuestion.options.map((option, oi) => {
                        const selected = answers[currentQuestion.id] === option;
                        return (
                          <button
                            key={oi}
                            onClick={() => handleAnswer(option)}
                            className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 text-sm ${
                              selected
                                ? "bg-[#c471ed]/15 border-[#c471ed] text-[#c471ed] shadow-[0_0_12px_rgba(196,113,237,0.15)]"
                                : "bg-[#111827] border-[rgba(196,113,237,0.1)] text-[#f0f4ff] hover:border-[rgba(196,113,237,0.3)] hover:bg-[#c471ed]/5"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={shortAnswerInput}
                          onChange={(e) => setShortAnswerInput(e.target.value)}
                          placeholder="Type your answer here..."
                          rows={3}
                          className="w-full bg-[#111827] border border-[rgba(196,113,237,0.2)] rounded-xl px-4 py-3 text-[#f0f4ff] text-sm placeholder-[#8892a4] focus:outline-none focus:border-[#c471ed] resize-none"
                        />
                        <button
                          onClick={handleShortAnswerSubmit}
                          disabled={!shortAnswerInput.trim()}
                          className="px-4 py-2 bg-[#c471ed] text-[#fff] rounded-lg font-semibold text-sm disabled:opacity-40 hover:bg-[#d08cf0] transition-colors"
                        >
                          Save Answer
                        </button>
                        {answers[currentQuestion.id] && (
                          <p className="text-[#4ade80] text-xs mt-1">
                            ✓ Saved: &ldquo;{answers[currentQuestion.id].slice(0, 80)}...&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={goPrev}
                  disabled={currentQ === 0}
                  className="px-4 py-2 bg-[#1a2340] border border-[rgba(196,113,237,0.2)] text-[#f0f4ff] rounded-lg text-sm font-medium disabled:opacity-30 hover:border-[#c471ed]/50 transition-all"
                >
                  ← Previous
                </button>

                {currentQ === questions.length - 1 ? (
                  <button
                    onClick={submitQuiz}
                    disabled={answeredCount < questions.length}
                    className="px-6 py-2 bg-[#c471ed] text-[#fff] rounded-lg text-sm font-bold shadow-[0_0_20px_rgba(196,113,237,0.3)] hover:bg-[#d08cf0] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Submit Exam ({answeredCount}/{questions.length})
                  </button>
                ) : (
                  <button
                    onClick={goNext}
                    className="px-4 py-2 bg-[#c471ed] text-[#fff] rounded-lg text-sm font-bold hover:bg-[#d08cf0] transition-all"
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {phase === "results" && (
            <div className="p-6 space-y-6">
              {/* Score card */}
              <div className="text-center py-6 bg-[#111827] border border-[rgba(196,113,237,0.15)] rounded-2xl">
                <div className={`text-6xl font-black mb-2 ${
                  percentage >= 80 ? "text-[#4ade80]" :
                  percentage >= 60 ? "text-[#c471ed]" : "text-[#f87171]"
                }`}>
                  {percentage}%
                </div>
                <p className="text-[#f0f4ff] text-xl font-semibold">
                  {score} / {questions.length} correct
                </p>
                <p className={`text-sm mt-2 ${
                  percentage >= 80 ? "text-[#4ade80]" :
                  percentage >= 60 ? "text-[#c471ed]" : "text-[#f87171]"
                }`}>
                  {percentage >= 80 ? "🎉 Excellent! You've mastered this material!" :
                   percentage >= 60 ? "📚 Good effort! Review the weak areas below." :
                   "💪 Keep studying! Review the explanations carefully."}
                </p>
              </div>

              {/* Score breakdown visual */}
              <div className="w-full bg-[#1a2340] rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-1000 ${
                    percentage >= 80 ? "bg-gradient-to-r from-[#4ade80] to-[#22c55e]" :
                    percentage >= 60 ? "bg-gradient-to-r from-[#c471ed] to-[#d08cf0]" :
                    "bg-gradient-to-r from-[#f87171] to-[#ef4444]"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Weak areas */}
              {weakAreas.length > 0 && (
                <div>
                  <h3 className="text-[#f87171] font-semibold text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Areas to Review ({weakAreas.length})
                  </h3>
                  <div className="space-y-2">
                    {weakAreas.map((q) => (
                      <div key={q.id} className="p-3 bg-[#f87171]/5 border border-[#f87171]/20 rounded-lg">
                        <p className="text-[#f0f4ff] text-xs font-medium">Q{q.id}. {q.question}</p>
                        <p className="text-[#8892a4] text-xs mt-1">
                          Your answer: <span className="text-[#f87171]">{answers[q.id] || "Not answered"}</span>
                        </p>
                        <p className="text-[#8892a4] text-xs mt-0.5">
                          Correct: <span className="text-[#4ade80]">{q.correctAnswer}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All questions review */}
              <div>
                <h3 className="text-[#f0f4ff] font-semibold text-sm uppercase tracking-widest mb-3">Full Review</h3>
                <div className="space-y-4">
                  {questions.map((q) => {
                    const userAns = answers[q.id] ?? "Not answered";
                    const isCorrect = (() => {
                      const ua = userAns.trim().toLowerCase();
                      const ca = q.correctAnswer.trim().toLowerCase();
                      if (q.type === "shortanswer") {
                        const words = ca.split(/\s+/).filter((w) => w.length > 3);
                        const matchCount = words.filter((w) => ua.includes(w)).length;
                        return matchCount >= Math.ceil(words.length * 0.5);
                      }
                      return ua === ca || ua.startsWith(ca.charAt(0));
                    })();

                    return (
                      <div key={q.id} className={`p-4 rounded-xl border ${
                        isCorrect ? "bg-[#4ade80]/5 border-[#4ade80]/20" : "bg-[#f87171]/5 border-[#f87171]/20"
                      }`}>
                        <div className="flex items-start gap-2">
                          <span className={`text-lg mt-0.5 shrink-0 ${isCorrect ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                            {isCorrect ? "✓" : "✗"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#f0f4ff] text-sm font-medium">{q.question}</p>
                            {!isCorrect && (
                              <>
                                <p className="text-xs mt-1 text-[#8892a4]">
                                  Your answer: <span className="text-[#f87171]">{userAns}</span>
                                </p>
                                <p className="text-xs mt-0.5 text-[#8892a4]">
                                  Correct: <span className="text-[#4ade80]">{q.correctAnswer}</span>
                                </p>
                              </>
                            )}
                            <p className="text-xs mt-2 text-[#8892a4] leading-relaxed">{q.explanation}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Retry */}
              <button
                onClick={fetchQuiz}
                className="w-full py-3 bg-[#c471ed] text-[#fff] rounded-xl font-bold text-sm hover:bg-[#d08cf0] transition-all shadow-[0_0_20px_rgba(196,113,237,0.2)]"
              >
                Generate New Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
