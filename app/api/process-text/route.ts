import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { SUMMARY_SYSTEM_PROMPT, SUGGESTED_QUESTIONS_PROMPT } from "@/lib/prompts";

// Inlined here to avoid importing @/lib/parsers which loads mammoth/pdf-parse/officeparser
// at module level — those native deps can crash the Vercel function before try/catch runs.
function truncateText(text: string, maxChars = 12000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[Document truncated for processing...]";
}

export const runtime = "nodejs";
export const maxDuration = 60;

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      text: string;
      filename: string;
      fileSize: number;
    };

    const { text, filename, fileSize } = body;

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract meaningful text from this file. It may contain only images or be empty." },
        { status: 422 }
      );
    }

    const documentContent = truncateText(text, 12000);

    // Generate summary
    const summaryCompletion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SUMMARY_SYSTEM_PROMPT },
        { role: "user", content: `Please summarize this document:\n\n${documentContent}` },
      ],
      temperature: 0.5,
      max_tokens: 1024,
    });

    const summary = summaryCompletion.choices[0]?.message?.content ?? "Summary unavailable.";

    // Generate suggested questions
    let suggestedQuestions: string[] = [];
    try {
      const sqCompletion = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Document content:\n${documentContent.slice(0, 4000)}\n\n${SUGGESTED_QUESTIONS_PROMPT}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 256,
      });
      const sqRaw = sqCompletion.choices[0]?.message?.content ?? "[]";
      const cleaned = sqRaw.replace(/```json|```/g, "").trim();
      suggestedQuestions = JSON.parse(cleaned);
    } catch {
      suggestedQuestions = [
        "What are the main concepts covered?",
        "Can you explain the key terms?",
        "What are the most important points?",
        "Can you give an example of the core idea?",
      ];
    }

    return NextResponse.json({
      success: true,
      filename,
      fileSize,
      charCount: text.length,
      documentContent,
      summary,
      suggestedQuestions,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("process-text route error:", msg);
    return NextResponse.json(
      { error: `Server error: ${msg}` },
      { status: 500 }
    );
  }
}
