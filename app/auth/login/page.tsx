"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LogoMark = () => (
  <div
    style={{
      width: 48, height: 48,
      borderRadius: 13,
      background: "linear-gradient(145deg, #f5c518 0%, #e8a800 100%)",
      boxShadow: "0 2px 20px rgba(245,197,24,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}
  >
    <svg fill="#000" viewBox="0 0 20 20" style={{ width: 25, height: 25 }}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  </div>
);

const IconGoogle = () => (
  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const IconGitHub = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export default function LoginPage() {
  const [loading, setLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const signIn = async (provider: "google" | "github") => {
    setLoading(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#000000" }}
    >
      {/* Background glow */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(196,113,237,0.12) 0%, transparent 70%)",
        }}
      />

      <div
        className="relative z-10 w-full animate-fadeSlideUp"
        style={{ maxWidth: 420 }}
      >
        {/* Card */}
        <div
          className="smb-panel p-8"
          style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <LogoMark />
            <h1
              className="mt-4 text-xl font-bold tracking-tight"
              style={{ color: "#eef2f9" }}
            >
              StudyMind AI
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(196,113,237,0.7)" }}>
              Sign in to start studying smarter
            </p>
          </div>

          {/* OAuth buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => signIn("google")}
              disabled={!!loading}
              className="flex items-center justify-center gap-3 w-full py-3 rounded-xl font-medium text-sm active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "#fff",
                color: "#111",
                transition: "opacity 150ms ease, transform 150ms ease, background-color 150ms ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f5f5f5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; }}
            >
              {loading === "google" ? (
                <div className="w-4 h-4 rounded-full border-2 border-[#c471ed]/30 border-t-[#c471ed] animate-spin" />
              ) : <IconGoogle />}
              Continue with Google
            </button>

            <button
              onClick={() => signIn("github")}
              disabled={!!loading}
              className="flex items-center justify-center gap-3 w-full py-3 rounded-xl font-medium text-sm active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "#21262d",
                color: "#eef2f9",
                border: "1px solid rgba(255,255,255,0.1)",
                transition: "opacity 150ms ease, transform 150ms ease, background-color 150ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2d333b"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#21262d"; }}
            >
              {loading === "github" ? (
                <div className="w-4 h-4 rounded-full border-2 border-[#c471ed]/30 border-t-[#c471ed] animate-spin" />
              ) : <IconGitHub />}
              Continue with GitHub
            </button>
          </div>

          {error && (
            <p className="mt-4 text-xs text-center" style={{ color: "#f87171" }}>
              {error}
            </p>
          )}

          {/* Divider */}
          <div
            className="mt-8 pt-6 text-center text-xs"
            style={{ borderTop: "1px solid #1a1726", color: "#475569" }}
          >
            Your documents and chat history are private to your account.
          </div>
        </div>
      </div>
    </div>
  );
}
