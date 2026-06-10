import mammoth from "mammoth";
import { parseOffice } from "officeparser";

export async function parseDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

export async function parsePPTX(buffer: Buffer): Promise<string> {
  // officeparser v6 — use ast.toText() for reliable plain-text extraction
  const ast = await parseOffice(buffer);
  return ast.toText().trim();
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    return parseDOCX(buffer);
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    ext === "pptx"
  ) {
    return parsePPTX(buffer);
  }

  throw new Error(`Unsupported file type: ${mimeType} / .${ext}`);
}

export function truncateText(text: string, maxChars = 12000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[Document truncated for processing...]";
}
