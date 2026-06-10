import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import {
  CHAT_SYSTEM_PROMPT,
  ELI5_INSTRUCTIONS,
  COMPARE_INSTRUCTIONS,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      documentContent,
      eli5Mode,
      compareMode,
      secondDocContent,
      doc1Filename,
      doc2Filename,
    } = body as {
      messages: ChatMessage[];
      documentContent: string;
      eli5Mode?: boolean;
      compareMode?: boolean;
      secondDocContent?: string;
      doc1Filename?: string;
      doc2Filename?: string;
    };

    if (!messages || !documentContent) {
      return NextResponse.json({ error: "Missing messages or documentContent" }, { status: 400 });
    }

    let systemPrompt: string;

    if (compareMode && secondDocContent) {
      systemPrompt = COMPARE_INSTRUCTIONS
        .replace("{doc1}", documentContent.slice(0, 5000))
        .replace("{doc2}", secondDocContent.slice(0, 5000));
      if (doc1Filename) systemPrompt = systemPrompt.replace("Document 1 content", `Document 1 — ${doc1Filename}`);
      if (doc2Filename) systemPrompt = systemPrompt.replace("Document 2 content", `Document 2 — ${doc2Filename}`);
    } else {
      // Use 6 000 chars (~1 500 tokens) instead of 10 000 to reduce quota usage
      systemPrompt = CHAT_SYSTEM_PROMPT.replace(
        "{documentContent}",
        documentContent.slice(0, 6000)
      );
    }

    if (eli5Mode) {
      systemPrompt += "\n\n" + ELI5_INSTRUCTIONS;
    }

    // Keep only the last 6 messages (3 exchanges) to further reduce tokens
    const trimmedMessages = messages.slice(-6);

    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: eli5Mode ? 0.7 : 0.6,
      max_tokens: 800,
    });

    const reply = completion.choices[0]?.message?.content ?? "I could not generate a response.";
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat route error:", error);
    const groqMsg = (error as { error?: { message?: string } })?.error?.message;
    const errMsg = groqMsg ?? (error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
