import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { QUIZ_SYSTEM_PROMPT } from "@/lib/prompts";
import { truncateText } from "@/lib/parsers";

export const runtime = "nodejs";
export const maxDuration = 60;

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

const TOPIC_QUIZ_PROMPT = (topic: string, count: number) =>
  `You are StudyMind AI. Generate exactly ${count} exam questions focused ONLY on the topic: "${topic}".
Use the provided document content. Mix question types. Include a "topic" field with value "${topic}" in every question.
Return ONLY a valid JSON array with the same structure as below, no markdown, no explanation:
[{"id":1,"type":"mcq","question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A","explanation":"...","topic":"${topic}"},...]`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentContent, topicFilter } = body as {
      documentContent: string;
      topicFilter?: string;
    };

    if (!documentContent) {
      return NextResponse.json({ error: "Missing documentContent" }, { status: 400 });
    }

    const content = truncateText(documentContent, 10000);
    const isTopic = !!topicFilter;
    const count = isTopic ? 5 : 10;

    const systemPrompt = isTopic
      ? TOPIC_QUIZ_PROMPT(topicFilter!, count)
      : QUIZ_SYSTEM_PROMPT;

    const userMsg = isTopic
      ? `Generate ${count} questions about "${topicFilter}" from this document:\n\n${content}`
      : `Generate 10 exam questions based on this document:\n\n${content}`;

    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let questions;
    try {
      questions = JSON.parse(cleaned);
      if (!Array.isArray(questions) || questions.length === 0) throw new Error("Invalid format");
    } catch (parseErr) {
      console.error("Quiz parse error:", parseErr, "\nRaw:", raw);
      return NextResponse.json({ error: "Failed to parse quiz questions. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Quiz route error:", error);
    return NextResponse.json({ error: "Failed to generate quiz. Please try again." }, { status: 500 });
  }
}
