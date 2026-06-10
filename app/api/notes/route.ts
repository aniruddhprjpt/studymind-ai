import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { NOTES_SYSTEM_PROMPT } from "@/lib/prompts";
import { truncateText } from "@/lib/truncate";

export const runtime = "nodejs";
export const maxDuration = 60;

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

const QUICK_PROMPT = `You are StudyMind AI. Create a concise quick-reference summary from this document.

Format:
# [Topic]
## TL;DR
(3–4 sentences capturing the whole document)

## Key Points
- Each point is one clear, complete sentence explaining the idea — not a fragment
- Include why each point is significant

## Must-Know Terms
- **Term**: Definition in one sentence

## 3 Things to Remember
1. Most important takeaway written as a complete sentence
2. Second most important
3. Third most important

Use ONLY the document. Be brief but accurate.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentContent, depth = "deep" } = body as {
      documentContent: string;
      depth?: "quick" | "deep";
    };

    if (!documentContent) {
      return NextResponse.json(
        { error: "Missing documentContent" },
        { status: 400 }
      );
    }

    const isQuick = depth === "quick";
    const content = truncateText(documentContent, isQuick ? 8000 : 12000);
    const systemPrompt = isQuick ? QUICK_PROMPT : NOTES_SYSTEM_PROMPT;
    const userMsg = isQuick
      ? `Create a quick-reference summary from this document:\n\n${content}`
      : `Create comprehensive, deeply explanatory study notes from this document. Follow every instruction in the format exactly — include all sections, full explanations, real-world examples, the definitions table, and the connections paragraph:\n\n${content}`;

    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg },
      ],
      temperature: isQuick ? 0.3 : 0.5,
      max_tokens: isQuick ? 1500 : 4096,
    });

    const notes = completion.choices[0]?.message?.content ?? "Notes unavailable.";
    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Notes route error:", error);
    return NextResponse.json(
      { error: "Failed to generate study notes. Please try again." },
      { status: 500 }
    );
  }
}
