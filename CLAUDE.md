# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A KI-gestützter Business-Übersetzer (AI-powered business text translator) built as the practical demonstrator for the university module DLBFMPGKIU01 ("Projekt: Generative KI im Unternehmenskontext"), Aufgabe 1. Users paste business text (emails, internal documents, notes) → the system auto-detects the source language → translates with streaming output → optionally adjusts tone or re-translates a commented segment.

**Fictional framing:** a start-up offering AI translation solutions to SMEs (KMU) in the DACH region, 20–250 employees, regular international business correspondence.

**Goal:** Fulfill the Anforderungsliste (FA-01–FA-15, NFA-01–NFA-04) as a working, defensible demonstrator for a graded academic portfolio — not a toy app, but also intentionally scoped tighter than a commercial product.

---

## Scope boundary vs. Meeting Intelligence Tool

This project is **standalone** and covers **general business communication** (emails, internal documents, notes) only.
**Out of scope by design** (see FA-13/FA-14, Won't-priority): meeting transcripts, live meeting translation, RAG chat, action-item extraction. Those live exclusively in the separate "Meeting Intelligence Tool" portfolio project. If a feature idea drifts toward "meeting," it belongs in that other repo, not here.

---

## Tech Stack

| Layer               | Technology                      | Version               |
| -------------------- | -------------------------------- | ---------------------- |
| Framework            | Next.js (App Router)             | 16                     |
| Language             | TypeScript                       | strict mode            |
| Styling              | Tailwind CSS                     | v4                     |
| UI Components        | shadcn/ui                        | radix-vega style       |
| AI Abstraction        | Vercel AI SDK                     | latest                 |
| AI Provider (dev)     | Ollama via `ollama-ai-provider`   | qwen2.5:7b              |
| AI Provider (prod)    | Mistral Small 4                   | via `@ai-sdk/mistral`  |
| Database + Auth       | Supabase                          | PostgreSQL (no pgvector needed — no RAG in this project) |
| Deployment            | Vercel                            | —                       |
| Package Manager       | pnpm                              | —                       |

> **Warum Mistral Small 4 in Produktion?** EU-Datenresidenz + günstigste verifizierte Preise (Stand Juli 2026, direkt bei Mistral verifiziert). Begründung im Vergleich zu OpenAI/DeepL API/Anthropic gehört in die Phase-2-Dokumentation (Komponentenauswahl).

---

## Commands

```bash
pnpm dev      # start dev server on localhost:3000
pnpm build    # production build
pnpm lint     # run ESLint
```

No test suite is configured yet.

---

## Folder Structure

**Important:** There is no `src/` directory. The `@/*` alias maps to the project root.

```
app/
├── (auth)/
│   └── login/            → Sign-in / Sign-up page
├── dashboard/             → Protected, requires auth — translation input + history
├── api/
│   ├── translate/         → POST: streamText, detects source lang, translates
│   ├── retranslate/       → POST: re-translate a single segment with a comment/instruction (FA-07)
│   └── export/            → POST: render translation as PDF (FA-11)
└── layout.tsx
components/                → Reusable UI (shadcn components go here)
lib/
├── supabase/
│   ├── client.ts          → Browser-side Supabase client
│   ├── server.ts          → Server-side Supabase client (Route Handlers)
│   └── middleware.ts      → updateSession helper (imported by root middleware.ts)
└── ai/
    ├── provider.ts        → Provider switch: Ollama (dev) / Mistral Small 4 (prod)
    └── schema.ts          → Zod schema for translation response (incl. detected source language)
middleware.ts               → Root middleware — imports updateSession from lib/supabase/middleware.ts
```

---

## Architecture & Data Flow

### Translation Flow

```
User pastes business text, selects target language (+ optional tone, FA-08)
→ POST /api/translate
→ LLM detects source language (FA-02) and translates
→ streamText streams translation back
→ Frontend renders live
→ Output is visibly labeled as AI-generated (FA-05 — EU AI Act Art. 50)
→ Result saved to Supabase (FA-09, history)
```

### Segment Comment / Re-translation Flow (FA-07)

```
User adds a comment to a segment (e.g. terminology hint, style note)
→ POST /api/retranslate
→ Segment + comment sent to LLM
→ Segment re-translated considering the comment
→ Frontend updates just that segment
```

No embeddings, chunking, or similarity search anywhere in this project — there is no RAG requirement in the Anforderungsliste.

---

## Key Patterns & Conventions

### AI Provider Switch

The active provider is controlled via `AI_PROVIDER` env var. Never hardcode a provider.

```ts
// lib/ai/provider.ts
import { createOllama } from 'ollama-ai-provider';
import { mistral } from '@ai-sdk/mistral';

export function getModel() {
  if (process.env.AI_PROVIDER === 'ollama') {
    return createOllama()('qwen2.5:7b');
  }
  return mistral('mistral-small-latest');
}
```

### Translation Schema (Zod)

```ts
// lib/ai/schema.ts
import { z } from 'zod';

export const translationSchema = z.object({
  detectedSourceLanguage: z.string(),
  translatedText: z.string(),
  aiGenerated: z.literal(true), // always surfaced in UI per FA-05
});
```

### Supabase Client Usage

- Use `@/lib/supabase/client.ts` in Client Components
- Use `@/lib/supabase/server.ts` in Route Handlers and Server Components
- Never use the service role key client-side

### Non-binding disclaimer (FA-10)

Every translation output must display a notice that it is a machine translation without legal validity — this is a liability-reduction requirement, not optional UI copy.

---

## Database Schema

```sql
-- Translations table (history, FA-09)
create table translations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source_text text not null,
  source_language text,
  target_language text not null,
  tone text,                    -- FA-08: formal | neutral | casual
  translated_text text not null,
  created_at timestamp default now()
);

-- RLS: users can only access their own data
alter table translations enable row level security;
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=    # NOTE: this is the publishable key, NOT the anon key
SUPABASE_SERVICE_ROLE_KEY=               # server-side only, never expose client-side

# AI
AI_PROVIDER=ollama               # 'ollama' | 'mistral'
MISTRAL_API_KEY=                 # prod only
```

---

## Requirements Reference (MoSCoW Anforderungsliste)

Full list lives in `docs/anforderungsliste.md` (also submitted as PDF for PebblePad Phase 1). Key must-haves already fixed and NOT to be casually changed without checking against this list first:

- FA-01 Must: translate between ≥2 language pairs (DE↔EN)
- FA-02 Must: auto-detect source language
- FA-03 Must: streamed output
- FA-04 Must: user authentication
- FA-05 Must: visibly label AI-generated translations (EU AI Act Art. 50)
- FA-06 Should: ≥4–5 languages offered
- FA-07 Should: segment-level comment → re-translation
- FA-08 Should: tone selection (formal/neutral/casual)
- FA-09 Should: persistent, findable translation history
- FA-10 Should: non-binding machine-translation disclaimer
- FA-11/12 Could: PDF export, copy-to-clipboard
- FA-13/14/15 Won't: no live audio translation, no simultaneous meeting translation, no certified/legally-binding translations
- NFA-01 Must: local dev without running API costs (→ Ollama)
- NFA-02 Must: secured access controls for personal data
- NFA-03 Must: encrypted client-server communication
- NFA-04 Should: pure web app, no local install needed at the KMU side

---

## Academic Submission Context (PebblePad, not part of the codebase but governs deadlines)

- 3 graded phases: Konzeption (done) → Erarbeitung/Reflexion (current) → Finalisierung
- Phase 2 deliverable: ½-page implementation write-up (PDF) + full reproducible demonstrator description (zip, folder "Erarbeitung")
- Phase 3 re-submits final Phase 1 + Phase 2 results alongside a 2-page Abstract and final example translations
- Strict phase order — deviation counts as a failed attempt
- Grading weights: Problemabgrenzung 10% · Methodik 20% · Umsetzungsqualität 40% · Kreativität 20% · Formalia 10%

---

## What Claude Code Should NOT Do

- Do not switch the AI provider without being asked — the `AI_PROVIDER` env var controls this intentionally
- Do not add pgvector, embeddings, or RAG — out of scope for this project by design
- Do not add meeting-specific features (transcripts, action items) — those belong to the other repo
- Do not change the Zod schema or Anforderungsliste-driven feature set without checking against the FA/NFA list above
- Do not add new Supabase tables without confirming the schema first
- Do not use `any` types — this project uses strict TypeScript throughout
- Do not install additional AI providers or SDKs unless explicitly asked
- Do not remove the AI-generated label (FA-05) or the non-binding disclaimer (FA-10) — both are graded/compliance requirements, not cosmetic

---

## Coding Conventions

- All components: functional, no class components
- Server vs Client: prefer Server Components, add `"use client"` only when needed (interactivity, hooks)
- Error handling: always handle loading + error states in UI
- Imports: use `@/*` alias (maps to project root), never relative `../../`
- Comments: explain _why_, not _what_ — especially around AI provider choice and EU AI Act compliance logic
- Commits: gitmoji (e.g. `✨ add translate route`, `🐛 fix language detection`, `♻️ refactor provider switch`)