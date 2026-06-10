import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { FORMULAS_PROMPT } from "@/lib/prompts";
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
        { role: "system", content: FORMULAS_PROMPT },
        { role: "user", content: `Extract all formulas, definitions, and facts from this document:\n\n${content}` },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const raw = (completion.choices[0]?.message?.content ?? "{}").trim();

    let data;
    try {
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      data = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse extracted data. Please try again." }, { status: 500 });
    }

    // Ensure all arrays exist
    data.formulas = data.formulas ?? [];
    data.definitions = data.definitions ?? [];
    data.facts = data.facts ?? [];

    return NextResponse.json(data);
  } catch (error) {
    console.error("Formulas route error:", error);
    return NextResponse.json({ error: "Failed to extract formulas." }, { status: 500 });
  }
}
