import { NextRequest, NextResponse } from "next/server";
import { extractText } from "@/lib/parsers";
import { truncateText } from "@/lib/truncate";
import Groq from "groq-sdk";
import { SUMMARY_SYSTEM_PROMPT, SUGGESTED_QUESTIONS_PROMPT } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB — Vercel Hobby plan limit is 4.5MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const ALLOWED_EXTENSIONS = ["pdf", "docx", "pptx"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isValidType =
      ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);

    if (!isValidType) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF, DOCX, or PPTX." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let rawText: string;
    try {
      rawText = await extractText(buffer, file.type, file.name);
    } catch (parseErr) {
      console.error("Parse error:", parseErr);
      return NextResponse.json(
        { error: "Failed to extract text from the file. The file may be corrupted or password-protected." },
        { status: 422 }
      );
    }

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract meaningful text from this file. It may contain only images or be empty." },
        { status: 422 }
      );
    }

    const documentContent = truncateText(rawText);

    // Generate summary
    const summaryCompletion = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SUMMARY_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Please summarize this document:\n\n${documentContent}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1024,
    });

    const summary =
      summaryCompletion.choices[0]?.message?.content ?? "Summary unavailable.";

    // Generate suggested questions
    let suggestedQuestions: string[] = [];
    try {
      const sqCompletion = await getGroq().chat.completions.create({
        model: "llama-3.1-8b-instant",
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
      filename: file.name,
      fileSize: file.size,
      charCount: rawText.length,
      documentContent,
      summary,
      suggestedQuestions,
    });
  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
