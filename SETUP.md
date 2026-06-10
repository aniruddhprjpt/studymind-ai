# StudyMind AI — Setup Guide

An intelligent AI study assistant that helps students understand study materials, take mock exams, and generate study notes. Powered by Groq's LLaMA 3.3-70B.

---

## Prerequisites

- **Node.js** 18.18.0 or later (`node --version`)
- **npm** 9+ or **pnpm** / **yarn**
- A free **Groq API key** → [console.groq.com](https://console.groq.com)

---

## Local Development Setup

### 1. Clone / enter the project directory

```bash
cd studymind-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and add your Groq API key:

```env
GROQ_API_KEY=gsk_your_actual_key_here
```

Get your key for free at [console.groq.com](https://console.groq.com) — the LLaMA 3.3-70B model has a generous free tier.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How to Use

1. **Upload a file** — drag and drop or click to browse. Supports PDF, DOCX, PPTX (max 10MB).
2. **Read the summary** — AI instantly summarizes the document in the chat panel.
3. **Ask questions** — type any question about the document. AI only answers from the document.
4. **Take a mock exam** — click "Mock Exam" to generate 10 questions (MCQ, True/False, Short Answer).
5. **Generate study notes** — click "Generate Study Notes" in the left panel, then download as `.txt`.

---

## Project Structure

```
studymind-ai/
├── app/
│   ├── api/
│   │   ├── upload/route.ts    # File parsing + summary generation
│   │   ├── chat/route.ts      # AI chat API
│   │   ├── quiz/route.ts      # Quiz generation API
│   │   └── notes/route.ts     # Study notes API
│   ├── globals.css            # Midnight Scholar theme
│   ├── layout.tsx
│   └── page.tsx               # Main app layout
├── components/
│   ├── FileUpload.tsx          # Drag & drop file uploader
│   ├── ChatPanel.tsx           # AI chat interface
│   ├── QuizModal.tsx           # Interactive mock exam
│   └── NotesPanel.tsx          # Study notes viewer
├── lib/
│   ├── parsers.ts              # PDF/DOCX/PPTX text extraction
│   └── prompts.ts              # All AI system prompts
├── .env.example
├── next.config.ts
└── SETUP.md
```

---

## Deploying to Vercel

### Option A: One-click deploy via Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked about environment variables, add `GROQ_API_KEY`.

### Option B: GitHub + Vercel dashboard

1. Push the project to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: StudyMind AI"
   git remote add origin https://github.com/YOUR_USERNAME/studymind-ai.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo.

3. In the **Environment Variables** section, add:
   - Key: `GROQ_API_KEY`
   - Value: `gsk_your_actual_key_here`

4. Click **Deploy**. Vercel auto-detects Next.js 15 and configures everything.

### Important Vercel settings

Vercel's default function timeout is 10s. The AI calls can take longer. In your `vercel.json` (create if needed):

```json
{
  "functions": {
    "app/api/**": {
      "maxDuration": 60
    }
  }
}
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ Yes | Your Groq API key from console.groq.com |

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| Next.js 15 | Framework (App Router) |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| Groq SDK | LLaMA 3.3-70B inference |
| pdf-parse | PDF text extraction |
| mammoth | DOCX text extraction |
| officeparser | PPTX text extraction |
| react-markdown | Markdown rendering in chat |
| canvas-confetti | Celebration animation |

---

## Troubleshooting

**"Could not extract meaningful text"**
→ The file may be image-based (scanned PDF). Only text-based files are supported.

**"Failed to generate quiz"**
→ Usually a temporary Groq API issue. Click "Try Again" or refresh.

**Build errors with pdf-parse**
→ Ensure `serverExternalPackages: ["pdf-parse", "mammoth", "officeparser"]` is in `next.config.ts` (already configured).

**Slow responses**
→ LLaMA 3.3-70B is a large model. Summary + suggested questions generate on upload (~5–10s). Chat responses are ~2–4s.
