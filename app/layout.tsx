import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "StudyMind AI — Intelligent Study Assistant",
  description:
    "Upload your study material and let AI explain it, quiz you, and generate study notes. Powered by LLaMA 3.3-70B.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0a0f1e]">{children}</body>
    </html>
  );
}
