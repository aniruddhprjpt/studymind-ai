"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  documentContent: string;
  documentContent2?: string;
  compareMode?: boolean;
  filename: string;
  filename2?: string;
  summary: string;
  suggestedQuestions: string[];
  preFillMessage?: string;
}

type RatingAction = "followup" | "example" | "great" | null;

// ── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({
  onRate,
  disabled,
  action,
}: {
  onRate: (stars: number) => void;
  disabled: boolean;
  action: RatingAction;
}) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);

  if (action === "great") {
    return (
      <p className="text-[#34d399] text-xs mt-2 flex items-center gap-1">
        🎯 Great! Moving on.
      </p>
    );
  }
  if (action === "example") {
    return (
      <p className="text-[#f5c518] text-xs mt-2 flex items-center gap-1 animate-fadeSlideUp">
        💡 Sending an example...
      </p>
    );
  }
  if (action === "followup") {
    return (
      <p className="text-[#60a5fa] text-xs mt-2 flex items-center gap-1 animate-fadeSlideUp">
        🔄 Let me try a different approach...
      </p>
    );
  }

  return (
    <div
      className="flex items-center gap-2 mt-2 pt-2"
      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <span className="text-[#475569] text-xs">Understood?</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={disabled || selected > 0}
            onClick={() => { setSelected(star); onRate(star); }}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-sm disabled:cursor-default active:scale-[0.97]"
            style={{
              transition: "transform 120ms ease",
              display: "inline-block",
            }}
          >
            <span style={{ color: star <= (hovered || selected) ? "#f5c518" : "#1e2d4a" }}>★</span>
          </button>
        ))}
      </div>
      {selected === 0 && (
        <span className="text-[#475569] text-xs">Rate this</span>
      )}
    </div>
  );
}

// ── AI Avatar ────────────────────────────────────────────────────────────────

const AI_ICON = (
  <div
    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
    style={{
      background: "linear-gradient(135deg, #60a5fa 0%, #0284c7 100%)",
    }}
  >
    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  </div>
);

// ── Chat Panel ───────────────────────────────────────────────────────────────

export default function ChatPanel({
  documentContent,
  documentContent2,
  compareMode,
  filename,
  filename2,
  summary,
  suggestedQuestions,
  preFillMessage,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: compareMode
        ? `## Compare Mode Active 📚\n\nI have both documents loaded. Ask me to compare them!\n\n**Doc 1:** ${filename}\n**Doc 2:** ${filename2 ?? "Document 2"}`
        : `## Document Loaded: ${filename}\n\n${summary}\n\n---\n\n*Ask me anything about this document! I'll only answer based on its content.*`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [eli5Mode, setEli5Mode] = useState(false);
  const [ratings, setRatings] = useState<Record<number, RatingAction>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Sync preFillMessage from MindMap node clicks
  useEffect(() => {
    if (preFillMessage) setInput(preFillMessage);
  }, [preFillMessage]);

  // Strip error messages from history before sending to API, keep last 10 exchanges
  const cleanHistory = (msgs: Message[]): Message[] => {
    const ERROR_TEXT = "Sorry, I encountered an error";
    const clean = msgs.filter((m) => !m.content.startsWith(ERROR_TEXT));
    if (clean.length <= 11) return clean;
    return [clean[0], ...clean.slice(-10)];
  };

  const callChatAPI = async (msgs: Message[], overrideEli5?: boolean): Promise<string> => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: cleanHistory(msgs),
        documentContent,
        eli5Mode: overrideEli5 ?? eli5Mode,
        compareMode: compareMode && !!documentContent2,
        secondDocContent: documentContent2,
        doc1Filename: filename,
        doc2Filename: filename2,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "API request failed");
    return data.reply as string;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMessage: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    try {
      const reply = await callChatAPI(newMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      const isRateLimit = msg.toLowerCase().includes("rate limit") || msg.includes("429");
      const isInvalidKey = msg.toLowerCase().includes("invalid api key") || msg.includes("401");
      let friendly: string;
      if (isRateLimit) {
        friendly = `⏳ **Rate limit reached** — Groq's free tier allows ~1–2 messages per minute.\n\nPlease wait **60 seconds** then try again, or upgrade at [console.groq.com](https://console.groq.com) for unlimited usage.`;
      } else if (isInvalidKey) {
        friendly = `🔑 **Invalid API Key** — Your Groq API key has expired or is incorrect.\n\n1. Go to [console.groq.com](https://console.groq.com) → API Keys\n2. Create a new key\n3. Update \`.env.local\` and restart the server.`;
      } else {
        friendly = `⚠️ **Error:** ${msg}\n\nIf this keeps happening, check your API key and restart the server.`;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: friendly }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRating = async (msgIdx: number, stars: number) => {
    if (stars >= 4) {
      setRatings((p) => ({ ...p, [msgIdx]: "great" }));
      return;
    }
    if (stars === 3) {
      setRatings((p) => ({ ...p, [msgIdx]: "example" }));
      const aiMsg = messages[msgIdx];
      await handleAutoFollowup(
        aiMsg,
        `Give me a simple real-world example that illustrates: "${aiMsg.content.slice(0, 120)}"`
      );
      return;
    }
    // 1–2 stars: completely different explanation
    setRatings((p) => ({ ...p, [msgIdx]: "followup" }));
    const aiMsg = messages[msgIdx];
    await handleAutoFollowup(
      aiMsg,
      `Please re-explain this using a completely different approach. Start with "Let me try explaining this differently...". Topic: "${aiMsg.content.slice(0, 120)}"`
    );
  };

  const handleAutoFollowup = async (aiMsg: Message, prompt: string) => {
    setIsLoading(true);
    try {
      const ctxMessages: Message[] = [
        ...messages,
        { role: "user", content: prompt },
      ];
      const reply = await callChatAPI(ctxMessages, true);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleQuickAction = (prefix: string) => {
    const lastAI = [...messages].reverse().find(
      (m) => m.role === "assistant" && !m.content.startsWith("⚠️") && !m.content.startsWith("Sorry, I encountered")
    );
    if (!lastAI) return;
    sendMessage(`${prefix}: "${lastAI.content.slice(0, 120)}..."`);
  };

  const compareQuestions = [
    "What are the main differences between the two documents?",
    "What topics are covered in Doc 2 but not Doc 1?",
    "What do both documents agree on?",
    "Summarise the key differences between Doc 1 and Doc 2",
  ];

  return (
    <div className="flex flex-col h-full">

      {/* ELI5 banner */}
      {eli5Mode && (
        <div
          className="mx-4 mt-3 px-3 py-2 rounded-xl flex items-center gap-2 shrink-0"
          style={{
            background: "rgba(245,197,24,0.07)",
            border: "1px solid rgba(245,197,24,0.2)",
          }}
        >
          <span className="text-base">🧒</span>
          <p className="text-[#f5c518] text-xs font-medium flex-1">
            ELI5 Mode Active — Explaining everything like you&apos;re 5
          </p>
          <button
            onClick={() => setEli5Mode(false)}
            className="text-[#475569] hover:text-[#f87171] text-xs active:scale-[0.97]"
            style={{ transition: "color 150ms ease, transform 150ms ease" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fadeSlideUp`}
          >
            {msg.role === "assistant" && AI_ICON}

            <div
              className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
              style={
                msg.role === "user"
                  ? {
                      background: "#f5c518",
                      color: "#060b18",
                      fontWeight: 500,
                      borderBottomRightRadius: 6,
                    }
                  : {
                      background: "#111e36",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "#eef2f9",
                      borderBottomLeftRadius: 6,
                    }
              }
            >
              {msg.role === "assistant" ? (
                <>
                  <div className="prose prose-invert prose-sm max-w-none prose-headings:text-[#60a5fa] prose-strong:text-[#f5c518] prose-code:text-[#60a5fa] prose-a:text-[#60a5fa]">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {i > 0 && (
                    <StarRating
                      onRate={(stars) => handleRating(i, stars)}
                      disabled={isLoading}
                      action={ratings[i] ?? null}
                    />
                  )}
                </>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>

            {msg.role === "user" && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
                style={{
                  background: "#111e36",
                  border: "1px solid rgba(245,197,24,0.2)",
                }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  style={{ color: "#f5c518" }}
                >
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-2.5 justify-start animate-fadeSlideUp">
            {AI_ICON}
            <div
              className="rounded-2xl px-3.5 py-3"
              style={{
                background: "#111e36",
                border: "1px solid rgba(255,255,255,0.06)",
                borderBottomLeftRadius: 6,
              }}
            >
              <div className="flex gap-1.5 items-center h-4">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: "#475569", animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested / compare questions */}
      {(compareMode ? true : suggestedQuestions.length > 0 && messages.length <= 2) && (
        <div className="px-4 pb-2">
          <p className="text-[#475569] text-[10px] uppercase tracking-widest mb-2 font-semibold">
            {compareMode ? "Compare Questions" : "Suggested Questions"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(compareMode ? compareQuestions : suggestedQuestions).map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-full disabled:opacity-40 active:scale-[0.97]"
                style={{
                  background: "rgba(17,30,54,0.8)",
                  border: "1px solid rgba(96,165,250,0.2)",
                  color: "#60a5fa",
                  transition: "background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(96,165,250,0.45)";
                  e.currentTarget.style.backgroundColor = "rgba(96,165,250,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(96,165,250,0.2)";
                  e.currentTarget.style.backgroundColor = "rgba(17,30,54,0.8)";
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      {messages.length > 1 && (
        <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
          <button
            onClick={() => setEli5Mode(!eli5Mode)}
            className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 active:scale-[0.97]"
            style={{
              background: eli5Mode ? "rgba(245,197,24,0.12)" : "rgba(17,30,54,0.8)",
              border: eli5Mode ? "1px solid rgba(245,197,24,0.4)" : "1px solid rgba(245,197,24,0.15)",
              color: "#f5c518",
              transition: "background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
            }}
          >
            🧒 ELI5 {eli5Mode ? "ON" : "OFF"}
          </button>

          <button
            onClick={() => handleQuickAction("Explain this more simply")}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 disabled:opacity-40 active:scale-[0.97]"
            style={{
              background: "rgba(17,30,54,0.8)",
              border: "1px solid rgba(245,197,24,0.15)",
              color: "#f5c518",
              transition: "background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(245,197,24,0.35)";
              e.currentTarget.style.backgroundColor = "rgba(245,197,24,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(245,197,24,0.15)";
              e.currentTarget.style.backgroundColor = "rgba(17,30,54,0.8)";
            }}
          >
            🔍 Explain Simpler
          </button>

          <button
            onClick={() => handleQuickAction("Give me a real-world example of")}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 disabled:opacity-40 active:scale-[0.97]"
            style={{
              background: "rgba(17,30,54,0.8)",
              border: "1px solid rgba(245,197,24,0.15)",
              color: "#f5c518",
              transition: "background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(245,197,24,0.35)";
              e.currentTarget.style.backgroundColor = "rgba(245,197,24,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(245,197,24,0.15)";
              e.currentTarget.style.backgroundColor = "rgba(17,30,54,0.8)";
            }}
          >
            💡 Give Example
          </button>
        </div>
      )}

      {/* Input area */}
      <div
        className="px-4 pb-4 pt-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={compareMode ? "Ask about both documents…" : "Ask anything about the document…"}
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm placeholder-[#475569] max-h-32 scrollbar-thin disabled:opacity-50"
            style={{
              background: "#111e36",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#eef2f9",
              lineHeight: "1.5",
              transition: "border-color 150ms ease, box-shadow 150ms ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(245,197,24,0.3)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 128) + "px";
            }}
          />

          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]"
            style={{
              background: "#f5c518",
              color: "#060b18",
              boxShadow: "0 1px 12px rgba(245,197,24,0.2)",
              transition: "background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease",
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.boxShadow = "0 2px 18px rgba(245,197,24,0.35)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 12px rgba(245,197,24,0.2)";
            }}
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
