import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { STUDYPLAN_PROMPT } from "@/lib/prompts";
import { truncateText } from "@/lib/parsers";

export const runtime = "nodejs";
export const maxDuration = 60;

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { documentContent, examName, examDate } = await req.json() as {
      documentContent: string;
      examName: string;
      examDate: string; // ISO date string
    };

    if (!documentContent || !examName || !examDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const today = new Date();
    const exam = new Date(examDate);
    const daysAvailable = Math.max(1, Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const todayStr = today.toISOString().split("T")[0];

    const topicsSummary = truncateText(documentContent, 3000);

    const prompt = STUDYPLAN_PROMPT
      .replace("{examName}", examName)
      .replace("{daysAvailable}", String(daysAvailable))
      .replace("{today}", todayStr)
      .replace("{topicsSummary}", topicsSummary)
      .replace("{daysAvailable}", String(daysAvailable)); // second occurrence

    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `Create a study plan for my "${examName}" exam on ${examDate}. Today is ${todayStr}. I have ${daysAvailable} days.` },
      ],
      temperature: 0.5,
      max_tokens: 3000,
    });

    const raw = (completion.choices[0]?.message?.content ?? "{}").trim();

    let data;
    try {
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      data = JSON.parse(cleaned);
      if (!data.plan) throw new Error("No plan in response");
    } catch {
      return NextResponse.json({ error: "Failed to generate study plan. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ plan: data.plan, daysAvailable });
  } catch (error) {
    console.error("Study plan route error:", error);
    return NextResponse.json({ error: "Failed to generate study plan." }, { status: 500 });
  }
}
