import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { MINDMAP_PROMPT } from "@/lib/prompts";
import { truncateText } from "@/lib/truncate";

export const runtime = "nodejs";
export const maxDuration = 60;

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { documentContent } = await req.json() as { documentContent: string };
    if (!documentContent) {
      return NextResponse.json({ error: "Missing documentContent" }, { status: 400 });
    }

    const content = truncateText(documentContent, 8000);

    const completion = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: MINDMAP_PROMPT },
        { role: "user", content: `Build a mind map for this document:\n\n${content}` },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const raw = (completion.choices[0]?.message?.content ?? "{}").trim();

    let data;
    try {
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      data = JSON.parse(cleaned);
      if (!data.nodes || !data.links) throw new Error("Invalid mind map structure");
    } catch {
      return NextResponse.json({ error: "Failed to parse mind map data. Please try again." }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Mindmap route error:", error);
    return NextResponse.json({ error: "Failed to generate mind map." }, { status: 500 });
  }
}
