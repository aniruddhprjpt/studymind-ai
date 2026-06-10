/**
 * Standalone truncateText — kept separate from lib/parsers so API routes
 * can import ONLY this helper without pulling in mammoth / pdf-parse /
 * officeparser (which have native deps that crash Vercel serverless on import).
 */
export function truncateText(text: string, maxChars = 12000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[Document truncated for processing...]";
}
