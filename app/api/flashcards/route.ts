import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { FLASHCARDS_PROMPT } from "@/lib/prompts";
import { truncateText } from "@/lib/parsers";

export const runtime = "nodejs";
export const maxDuration = 60;

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { documentContent } = await req.json() as { documentContent: string };
    if (!documentContent) {
      return NextResponse.json({ error: "Missing documentContent" }, { status: 400 });
    }

    const content = truncateText(documentContent, 10000);

    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: FLASHCARDS_PROMPT },
        { role: "user", content: `Create 15 flashcards from this document:\n\n${content}` },
      ],
      temperature: 0.6,
      max_tokens: 2500,
    });

    const raw = (completion.choices[0]?.message?.content ?? "[]").trim();

    let cards;
    try {
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      cards = JSON.parse(cleaned);
      if (!Array.isArray(cards)) throw new Error("Expected array");
    } catch {
      return NextResponse.json({ error: "Failed to parse flashcards. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("Flashcards route error:", error);
    return NextResponse.json({ error: "Failed to generate flashcards." }, { status: 500 });
  }
}
