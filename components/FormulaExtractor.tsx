"use client";

import { useState, useMemo } from "react";

interface FormulaItem {
  id: string;
  content: string;
  description?: string;
  context?: string;
}
interface DefinitionItem {
  id: string;
  term: string;
  definition: string;
}
interface FactItem {
  id: string;
  content: string;
}

interface FormulaData {
  formulas: FormulaItem[];
  definitions: DefinitionItem[];
  facts: FactItem[];
}

interface Props {
  documentContent: string;
  onExplain: (text: string) => void;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg bg-[#1a2340] border border-[rgba(196,113,237,0.1)] hover:border-[#c471ed]/30 transition-all text-[#8892a4] hover:text-[#c471ed]" title="Copy">
      {copied
        ? <svg className="w-3.5 h-3.5 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      }
    </button>
  );
}

type SectionKey = "formulas" | "definitions" | "facts";

function Section({
  title, icon, count, open, onToggle, children
}: { title: string; icon: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-[rgba(196,113,237,0.1)] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#0d1526] hover:bg-[#111827] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-[#f0f4ff] text-sm font-semibold">{title}</span>
          <span className="text-xs px-2 py-0.5 bg-[#c471ed]/10 border border-[#c471ed]/20 rounded-full text-[#c471ed] font-mono">{count}</span>
        </div>
        <svg className={`w-4 h-4 text-[#8892a4] transition-transform ${open ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="p-3 space-y-2 bg-[#111827]">{children}</div>}
    </div>
  );
}

export default function FormulaExtractor({ documentContent, onExplain }: Props) {
  const [data, setData] = useState<FormulaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    formulas: true, definitions: true, facts: true
  });
  const [flashcardAdded, setFlashcardAdded] = useState<Set<string>>(new Set());

  const fetch_ = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/formulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentContent }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to extract");
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key: SectionKey) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const addToFlashcard = (front: string, back: string, id: string) => {
    const existing = JSON.parse(localStorage.getItem("studymind_custom_flashcards") ?? "[]");
    existing.push({ id: `custom_${Date.now()}`, front, back });
    localStorage.setItem("studymind_custom_flashcards", JSON.stringify(existing));
    setFlashcardAdded((prev) => new Set([...prev, id]));
    window.dispatchEvent(new Event("studymind_flashcards_updated"));
  };

  const filtered = useMemo(() => {
    if (!data) return data;
    const q = search.toLowerCase();
    if (!q) return data;
    return {
      formulas: data.formulas.filter((f) =>
        f.content.toLowerCase().includes(q) || (f.description ?? "").toLowerCase().includes(q)
      ),
      definitions: data.definitions.filter((d) =>
        d.term.toLowerCase().includes(q) || d.definition.toLowerCase().includes(q)
      ),
      facts: data.facts.filter((f) => f.content.toLowerCase().includes(q)),
    };
  }, [data, search]);

  if (!data && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 py-10">
        <div className="w-16 h-16 rounded-2xl bg-[#1a2340] border border-[rgba(196,113,237,0.2)] flex items-center justify-center text-3xl">🔬</div>
        <div className="text-center">
          <h3 className="text-[#f0f4ff] font-bold">Extract Formulas & Definitions</h3>
          <p className="text-[#8892a4] text-sm mt-1 max-w-xs leading-relaxed">
            AI scans your document for equations, defined terms, and key facts.
          </p>
        </div>
        {error && <p className="text-[#f87171] text-sm text-center px-4">{error}</p>}
        <button
          onClick={fetch_}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#c471ed] text-[#fff] rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(196,113,237,0.25)] hover:bg-[#d08cf0] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Extract Now
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-[#c471ed]/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[#c471ed] animate-spin" />
        </div>
        <p className="text-[#c471ed] font-semibold text-sm">Scanning document...</p>
        <div className="space-y-2 w-48">
          {[70, 50, 60].map((w, i) => (
            <div key={i} className="skeleton-shimmer h-2.5 rounded-full bg-[#1a2340]" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const d = filtered!;
  const total = d.formulas.length + d.definitions.length + d.facts.length;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search */}
      <div className="relative shrink-0">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892a4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${total} items...`}
          className="w-full pl-9 pr-4 py-2 bg-[#0d1526] border border-[rgba(196,113,237,0.2)] rounded-xl text-[#f0f4ff] text-sm placeholder-[#8892a4] focus:outline-none focus:border-[#c471ed]"
        />
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3">
        {/* Formulas */}
        <Section title="Equations & Formulas" icon="📐" count={d.formulas.length}
          open={openSections.formulas} onToggle={() => toggleSection("formulas")}>
          {d.formulas.length === 0
            ? <p className="text-[#8892a4] text-xs text-center py-2">No formulas found</p>
            : d.formulas.map((f) => (
              <div key={f.id} className="p-3 bg-[#0d1526] border border-[rgba(79,195,247,0.15)] rounded-lg">
                <p className="text-[#4fc3f7] font-mono text-sm font-bold">{f.content}</p>
                {f.description && <p className="text-[#8892a4] text-xs mt-1">{f.description}</p>}
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => onExplain(f.content)} className="text-xs px-2.5 py-1 bg-[#c471ed]/10 border border-[#c471ed]/20 text-[#c471ed] rounded-lg hover:bg-[#c471ed]/20 transition-all">Explain</button>
                  <button
                    onClick={() => addToFlashcard(f.content, f.description ?? f.content, f.id)}
                    disabled={flashcardAdded.has(f.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${flashcardAdded.has(f.id) ? "bg-[#4ade80]/10 border-[#4ade80]/20 text-[#4ade80]" : "bg-[#1a2340] border-[rgba(196,113,237,0.1)] text-[#8892a4] hover:border-[#c471ed]/30"}`}
                  >
                    {flashcardAdded.has(f.id) ? "✓ Added" : "+ Card"}
                  </button>
                  <CopyBtn text={f.content} />
                </div>
              </div>
            ))}
        </Section>

        {/* Definitions */}
        <Section title="Key Definitions" icon="📖" count={d.definitions.length}
          open={openSections.definitions} onToggle={() => toggleSection("definitions")}>
          {d.definitions.length === 0
            ? <p className="text-[#8892a4] text-xs text-center py-2">No definitions found</p>
            : d.definitions.map((def) => (
              <div key={def.id} className="p-3 bg-[#0d1526] border border-[rgba(196,113,237,0.12)] rounded-lg">
                <p className="text-[#c471ed] font-semibold text-sm">{def.term}</p>
                <p className="text-[#f0f4ff] text-xs mt-1 leading-relaxed">{def.definition}</p>
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => onExplain(`Explain the term "${def.term}"`)} className="text-xs px-2.5 py-1 bg-[#c471ed]/10 border border-[#c471ed]/20 text-[#c471ed] rounded-lg hover:bg-[#c471ed]/20 transition-all">Explain</button>
                  <button
                    onClick={() => addToFlashcard(def.term, def.definition, def.id)}
                    disabled={flashcardAdded.has(def.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${flashcardAdded.has(def.id) ? "bg-[#4ade80]/10 border-[#4ade80]/20 text-[#4ade80]" : "bg-[#1a2340] border-[rgba(196,113,237,0.1)] text-[#8892a4] hover:border-[#c471ed]/30"}`}
                  >
                    {flashcardAdded.has(def.id) ? "✓ Added" : "+ Card"}
                  </button>
                  <CopyBtn text={`${def.term}: ${def.definition}`} />
                </div>
              </div>
            ))}
        </Section>

        {/* Facts */}
        <Section title="Key Facts & Numbers" icon="💡" count={d.facts.length}
          open={openSections.facts} onToggle={() => toggleSection("facts")}>
          {d.facts.length === 0
            ? <p className="text-[#8892a4] text-xs text-center py-2">No key facts found</p>
            : d.facts.map((f) => (
              <div key={f.id} className="p-3 bg-[#0d1526] border border-[rgba(79,195,247,0.1)] rounded-lg flex items-start gap-2">
                <span className="text-[#4fc3f7] text-xs mt-0.5 shrink-0">▸</span>
                <p className="text-[#f0f4ff] text-xs leading-relaxed flex-1">{f.content}</p>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => onExplain(f.content)} className="text-xs px-2 py-1 bg-[#c471ed]/10 border border-[#c471ed]/20 text-[#c471ed] rounded-lg hover:bg-[#c471ed]/20 transition-all">Explain</button>
                  <CopyBtn text={f.content} />
                </div>
              </div>
            ))}
        </Section>
      </div>

      {/* Regenerate */}
      <button onClick={fetch_} className="shrink-0 flex items-center justify-center gap-2 py-2 bg-[#1a2340] border border-[rgba(196,113,237,0.15)] text-[#8892a4] text-xs rounded-xl hover:border-[#c471ed]/30 hover:text-[#f0f4ff] transition-all">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Re-extract
      </button>
    </div>
  );
}
