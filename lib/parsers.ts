import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { parseOffice, type OfficeContentNode } from "officeparser";

export async function parsePDF(buffer: Buffer): Promise<string> {
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const parser = new PDFParse({ data: uint8, verbosity: 0 });
  const result = await parser.getText();
  await parser.destroy();
  return (result.text ?? "").trim();
}

export async function parseDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

function extractNodeText(nodes: OfficeContentNode[]): string {
  return nodes
    .map((n) => {
      const childText = n.children ? extractNodeText(n.children) : "";
      return (n.text ?? childText).trim();
    })
    .filter(Boolean)
    .join("\n");
}

export async function parsePPTX(buffer: Buffer): Promise<string> {
  const ast = await parseOffice(buffer);
  return extractNodeText(ast.content).trim();
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (mimeType === "application/pdf" || ext === "pdf") {
    return parsePDF(buffer);
  }

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
