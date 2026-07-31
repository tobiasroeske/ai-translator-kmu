# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A KI-gestützter Business-Übersetzer (AI-powered business text translator) built as the practical demonstrator for the university module DLBFMPGKIU01 ("Projekt: Generative KI im Unternehmenskontext"), Aufgabe 1. Target flow: users paste business text (emails, internal documents, notes) → the system auto-detects the source language → translates with streaming output → optionally adjusts tone or re-translates a commented segment.

**Fictional framing:** a start-up offering AI translation solutions to SMEs (KMU) in the DACH region's export-oriented machinery and plant engineering sector (Maschinen- und Anlagenbau), 20–250 employees, regular international business correspondence with export partners.

**Goal:** Fulfill the Anforderungsliste (FA-01–FA-15, NFA-01–NFA-04, full text in `docs/anforderungsdokument.md`) as a working, defensible demonstrator for a graded academic portfolio.

**Scope boundary:** standalone project, general business communication only (emails, internal documents, notes). Meeting transcripts, live meeting translation, RAG chat, and action-item extraction are explicitly **Won't** (FA-13/14/15) — those live in a separate "Meeting Intelligence Tool" portfolio project. If a feature idea drifts toward "meeting," it belongs in that other repo, not here.

---

## Arbeitsweise mit Claude Code (Mentor-Modus)

Der Nutzer will bei diesem Projekt gezielt lernen, nicht nur ein fertiges Ergebnis bekommen. Das gilt für alle Feature-Implementierung (FA-01–FA-12), nicht für reine Projekt-/Tooling-Setup-Schritte:

- **Schritt für Schritt.** Ein sinnvoll kleiner Teil-Task nach dem anderen (z. B. "ein Schema anlegen", "eine Route", "eine Komponente") — nicht ganze Phasen/Features am Stück durchimplementieren.
- **Rollenverteilung "Erklären + Review":** Claude erklärt pro Schritt das Konzept und den Ansatz (z. B. wie `streamText`/`Output.object`/`useObject` zusammenspielen), zeigt bei Bedarf kurze Referenz-Snippets — der Nutzer schreibt den eigentlichen Code selbst. Claude reviewt danach und gibt Feedback.
- Claude baut **nicht** eigenständig ganze Dateien/Features durch, außer der Nutzer bittet explizit darum (z. B. weil ein Teil repetitiv ist und er lieber zum nächsten Lernpunkt springen will).
- **Laufende Checkliste** in `docs/progress-checklist.md` — nach jedem abgeschlossenen Schritt aktualisieren, damit jederzeit sichtbar ist, was erledigt ist und was als Nächstes ansteht.

---

## ⚠️ Current repo state vs. target architecture

**Read this before assuming any file matches the description below.** The repo was bootstrapped from a starter scaffold shared with the sibling "Meeting Intelligence Tool" project (single commit so far: "chore: initial setup"), and the scaffold's _functionality_ has **not yet been adapted** to this project (the naming/branding has — see below). Concretely, right now:

- Naming/branding is already fixed: `package.json` name is `ki-translator-kmu`, Docker image/container names and the `app/layout.tsx`, `app/dashboard/layout.tsx`, `app/(auth)/layout.tsx` titles all say "KI Translator KMU", and `.env.local.example` / `.github/workflows/ci.yml` headers match. Don't reintroduce "Meeting Intelligence" anywhere.
- `app/api/translate/route.ts` now exists (`streamText` + `Output.object({ schema: translationSchema })`, see `lib/ai/schema.ts`) alongside the still-present `app/api/chat/route.ts` generic chat endpoint (`useChat` + `DefaultChatTransport`) — the chat route will be deleted once `translate.tsx` replaces the dashboard chat UI. `/api/retranslate` (FA-07) doesn't exist yet.
- `lib/ai/provider.ts` (moved from `lib/provider/provider.ts`) now switches between `ollama` and `mistral` via `AI_PROVIDER`, matching the tech-stack table below.
- **`generateObject`/`streamObject` are deprecated as of `ai` v6+** (we're on v7) — use `streamText`/`generateText` with `output: Output.object({ schema })` instead. `app/api/translate/route.ts` is the reference implementation.
- There is no `lib/ai/schema.ts`, no translation Zod schema, no `translations` table/migration, no PDF export route, no tone/segment-comment UI — none of FA-02/05/07/08/09/10/11 are implemented yet.
- What **does** already work and is safe to build on: Supabase auth (email/password login + signup via Server Actions, session middleware, RLS-ready client setup), the `(auth)`/`dashboard` route group split, the shadcn/ui + Tailwind v4 setup, the lint/format/typecheck tooling, and the Docker/Ollama local-dev pipeline.

Until this gap is closed, treat the **Tech Stack / Architecture / Folder Structure / Key Patterns / Database Schema** sections below as the _target_ to build toward, not a description of files that currently exist — except where explicitly marked "(current)". When implementing FA-01–FA-12, expect to: rename/repurpose `app/api/chat` → `app/api/translate` + `app/api/retranslate`, add `lib/ai/schema.ts`, and add the `translations` table via a Supabase migration.

---

## Tech Stack

| Layer              | Technology                          | Version                                                                |
| ------------------ | ----------------------------------- | ---------------------------------------------------------------------- |
| Framework          | Next.js (App Router)                | 16.2.6                                                                 |
| Language           | TypeScript                          | strict mode                                                            |
| Styling            | Tailwind CSS                        | v4                                                                     |
| UI Components      | shadcn/ui                           | radix-ui based                                                         |
| AI Abstraction     | Vercel AI SDK                       | `ai` ^7 (bumped from ^6 to align provider spec with `@ai-sdk/mistral`) |
| AI Provider (dev)  | Ollama via `ai-sdk-ollama`          | qwen2.5:7b                                                             |
| AI Provider (prod) | Mistral Small via `@ai-sdk/mistral` | `mistral-small-latest`                                                 |
| Database + Auth    | Supabase                            | PostgreSQL (no pgvector — no RAG in this project)                      |
| Deployment         | Vercel                              | —                                                                      |
| Package Manager    | pnpm                                | 11.5.0 (pinned in `packageManager`)                                    |
| Node               | pinned via `.nvmrc`                 | 24                                                                     |

> **Warum Mistral Small 4 in Produktion?** EU-Datenresidenz + günstigste verifizierte Preise (Stand 10.07.2026, direkt bei Mistral verifiziert, siehe `docs/anforderungsdokument.md` Kostenschätzung). Begründung im Vergleich zu OpenAI/DeepL API/Anthropic gehört in die Phase-2-Dokumentation.

---

## Commands

```bash
pnpm dev              # start dev server on localhost:3000 (Turbopack)
pnpm build            # production build
pnpm start            # run the production build
pnpm lint             # ESLint
pnpm format           # Prettier --write
pnpm format:check     # Prettier --check
pnpm typecheck        # tsc --noEmit
pnpm ci:test          # lint + format:check + typecheck — run before every commit

# Docker (see docker-compose.yml)
pnpm docker:build     # build the app image
pnpm docker:up        # app + containerized Ollama (--profile ollama)
pnpm docker:up:prod   # app only, expects AI_PROVIDER=mistral + API key
pnpm docker:down
pnpm docker:restart   # docker:up with --build
pnpm docker:logs
pnpm docker:ps
```

No test suite is configured yet — there is no `pnpm test`. `pnpm ci:test` is the closest thing to a gate and should be run before committing.

---

## Folder Structure (current)

**Important:** There is no `src/` directory. The `@/*` alias maps to the project root. Relative imports (`./`, `../`) are **ESLint errors** — always use `@/*`.

```
app/
├── (auth)/
│   ├── actions.ts          → Server Actions: loginAction, signupAction, logout
│   ├── login/
│   │   ├── page.tsx        → login + signup tabs (shadcn Tabs)
│   │   └── schema.ts       → Zod schema for email/password validation
│   └── auth-code-error/    → shown when the OAuth/email-confirm callback fails
├── dashboard/               → protected (see proxy.ts), currently a chat demo
│   ├── layout.tsx
│   ├── page.tsx
│   └── chat.tsx             → useChat + chatTransport, "use client"
├── api/
│   ├── chat/route.ts        → POST: streamText via getModel(), generic chat (NOT translation)
│   ├── auth/callback/route.ts → GET: exchanges OAuth/email-confirm code for a session
│   ├── health/route.ts      → GET: liveness check for Docker healthcheck
│   └── ai-smoke-test/route.ts → GET: generateText "Pong" smoke test against the active provider
└── layout.tsx                → root layout, Inter font, "KI Translator KMU" metadata
components/
├── logoutButton.tsx
└── ui/                       → shadcn-generated, excluded from ESLint (globalIgnores)
lib/
├── supabase/
│   ├── client.ts             → browser-side Supabase client
│   ├── server.ts              → server-side Supabase client (Route Handlers, Server Components)
│   └── middleware.ts          → updateSession(), called from proxy.ts
├── ai/
│   ├── provider.ts            → getModel(): AI_PROVIDER switch (ollama | mistral)
│   └── chat-transport.ts      → DefaultChatTransport wrapping fetch to surface 401 as AUTH_ERROR
└── utils.ts                   → cn() (clsx + tailwind-merge)
proxy.ts                       → Next.js middleware entry, delegates to updateSession(), route matcher excludes health/smoke-test/static assets
docs/
└── anforderungsdokument.md    → full FA/NFA Anforderungsliste (German), source of truth for requirements
.agents/skills/                → vendored Supabase skill docs (auth/RLS/Postgres best practices)
```

---

## Architecture & Data Flow

### Auth flow (current, working)

```
proxy.ts (Next.js middleware) → lib/supabase/middleware.ts updateSession()
→ supabase.auth.getClaims() checks session
→ unauthenticated + page route → redirect to /login
→ unauthenticated + /api/* route → 401 JSON (not an HTML redirect — chat UI needs a fetch-friendly error)
→ public routes exempt from the check: /login, /auth*, /api/auth (the callback that ISSUES the session)
```

Login/signup go through Server Actions (`app/(auth)/actions.ts`), not client-side Supabase calls. Signup redirects straight to `/dashboard` only if email confirmation is disabled in the Supabase project (i.e. `data.session` is already set); otherwise the user sees a "check your email" message.

### Chat flow (current — stand-in for the translation flow)

```
Chat.tsx (dashboard) → useChat({ transport: chatTransport })
→ POST /api/chat → convertToModelMessages → streamText(getModel(), messages)
→ toUIMessageStreamResponse() → streamed back to the client
```

`chatTransport` (lib/ai/chat-transport.ts) wraps `fetch` specifically to turn a 401 from the middleware into a thrown `AUTH_ERROR`, since `useChat` doesn't otherwise surface HTTP status on its own.

### Translation flow (target — not yet built, FA-01/02/03)

```
User pastes business text, selects target language (+ optional tone, FA-08)
→ POST /api/translate
→ LLM detects source language (FA-02) and translates
→ streamText streams translation back
→ Frontend renders live
→ Output is visibly labeled as AI-generated directly on the result (badge, not footer/metadata) — targeted at the KMU employee who may forward the translated text (FA-05 — EU AI Act Art. 50)
→ Result saved to Supabase (FA-09, history)
```

### Segment Comment / Re-translation flow (target — FA-07, not yet built)

```
User adds a comment to a segment (e.g. terminology hint, style note)
→ POST /api/retranslate
→ Segment + comment sent to LLM
→ Segment re-translated considering the comment
→ Frontend updates just that segment
```

No embeddings, chunking, or similarity search anywhere in this project — there is no RAG requirement in the Anforderungsliste, and pgvector is intentionally not part of the stack.

---

## Key Patterns & Conventions

### AI Provider Switch (current)

The active provider is controlled via `AI_PROVIDER` env var. Never hardcode a provider.

```ts
// lib/ai/provider.ts (current)
export const getModel = () => {
  const provider = process.env.AI_PROVIDER ?? 'ollama';
  if (provider === 'ollama') {
    const ollama = createOllama({
      baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    });
    return ollama('qwen2.5:7b');
  }
  if (provider === 'mistral') {
    const mistral = createMistral({
      apiKey: process.env.MISTRAL_API_KEY,
    });
    return mistral('mistral-small-latest');
  }
  throw new Error(`Unknown AI_PROVIDER: "${provider}" — expected 'ollama' or 'mistral'`);
};
```

Baked-in gotcha already documented in-code: `baseURL` belongs on the `createOllama()` factory call, not on the `ollama(model, settings)` call — there's no URL option there.

### Translation Schema (Zod) — current

```ts
// lib/ai/schema.ts
import { z } from 'zod';

export const translationSchema = z.object({
  detectedSourceLanguage: z
    .string()
    .describe(
      'ISO 639-1 code of the language the source text is written in, e.g. "de", "en", "it"'
    ),
  translatedText: z.string().describe('The translated text'),
  aiGenerated: z.literal(true).describe('Whether the translation was generated by AI'),
});
```

### FA-02 language-catalog constraint (current)

`detectedSourceLanguage` is a free-form ISO 639-1 string, **not** an enum of the FA-06 catalog, and the
translation prompt does not mention the catalog at all. `POST /api/translate` runs detection and
translation as two separate model calls (`lib/ai/detect-language.ts`, cheap/non-streaming, then
`streamText` only if the result passes `isSupportedLanguageCode()`). An unsupported language short-circuits
before any translation call: the route returns `Response.json({ detectedSourceLanguage }, { status: 422 })`;
`useObject` reads that body into `error.message`, `translate.tsx` parses it back out and opens
`UnsupportedLanguageDialog` instead of rendering a translation.

This is deliberate and was measured, not assumed. A single combined call constrained to
`z.enum([...languageCodes, 'unsupported'])`, instructed to emit `'unsupported'` for out-of-catalog text,
failed against qwen2.5:7b: longer Italian business text came back as `de`, Portuguese as `fr` (3/3 runs
each). The same model named the language correctly 16/16 when it only had to report what it saw, in
isolation from any catalog/set-membership decision — that decision is the unreliable half of the job for
a 7B model, so it moved into `isSupportedLanguageCode()`. Splitting detection into its own call was the
next consequence of that: it means an out-of-catalog text is never translated at all (not generated and
discarded), and it sidesteps a real bug class — a hand-rolled "already complete" stream for the
unsupported case briefly showed `aiGenerated: true` before the UI could react, because that path doesn't
follow the schema's field order (`detectedSourceLanguage` → `translatedText` → `aiGenerated`) the way a
real stream does. Don't "simplify" this back into a single prompt/enum call.

### Supabase Client Usage (current)

- Use `@/lib/supabase/client.ts` in Client Components
- Use `@/lib/supabase/server.ts` in Route Handlers and Server Components (creates a fresh client per call — do not cache/globalize it under Fluid compute)
- Never use the service role key client-side
- Env vars are `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the **publishable** key, not the legacy anon key

### Non-binding disclaimer (target — FA-10, not yet built)

Every translation output must display a notice that it is a machine translation without legal validity — this is a liability-reduction requirement, not optional UI copy.

---

## Database Schema (target — no migrations exist yet)

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

There is currently no Supabase migrations directory in this repo — this schema has not been applied anywhere. Confirm with the user before creating new tables.

---

## Environment Variables (current)

See `.env.local.example` for the authoritative current list. Copy it to `.env.local` (gitignored). Key points:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=    # the publishable key, NOT the anon key
SUPABASE_SERVICE_ROLE_KEY=               # server-side only, never expose client-side

# AI — controls lib/ai/provider.ts
AI_PROVIDER=ollama               # 'ollama' | 'mistral'
MISTRAL_API_KEY=                 # required when AI_PROVIDER=mistral
OLLAMA_BASE_URL=                 # leave commented out for local dev; docker-compose injects the container URL
```

`AI_PROVIDER=ollama` pairs with `pnpm dev` (native Ollama) or `pnpm docker:up` (containerized Ollama, auto-pulls `qwen2.5:7b` on first start via `scripts/ollama-entrypoint.sh`). A production provider pairs with `pnpm docker:up:prod`.

---

## Requirements Reference (MoSCoW Anforderungsliste)

Full list lives in `docs/anforderungsdokument.md` (German; also submitted as PDF for PebblePad Phase 1). Key must-haves already fixed and NOT to be casually changed without checking against this list first:

- FA-01 Must: translate between ≥2 language pairs (DE↔EN)
- FA-02 Must: auto-detect source language, constrained to the FA-06 language catalog (not unrestricted detection — needed for systematic testability in the Finalisierungsphase)
- FA-03 Must: streamed output
- FA-04 Must: user authentication
- FA-05 Must: visibly label AI-generated translations directly on the translation output (not just metadata/footer) — addressed to the end user (KMU employee) who may forward the text (EU AI Act Art. 50, binding from 2026-08-02)
- FA-06 Should: ≥4–5 languages offered (DE, EN, FR, ES, optionally PL — matches core export markets of the target industry, see FA-06 justification in docs/anforderungsdokument.md)
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
- Do not add meeting-specific features (transcripts, action items) — those belong to the other repo, even though the underlying scaffold originated from that project
- Do not change the Zod schema or Anforderungsliste-driven feature set without checking against the FA/NFA list above
- Do not add new Supabase tables/migrations without confirming the schema first
- Do not use `any` types — enforced by `@typescript-eslint/no-explicit-any: error`
- Do not install additional AI providers or SDKs unless explicitly asked
- Do not remove the AI-generated label (FA-05) or the non-binding disclaimer (FA-10) once built — both are graded/compliance requirements, not cosmetic
- Do not reintroduce "Meeting Intelligence" naming (package name, Docker image/container names, layout metadata) — it was renamed to "ki-translator-kmu" / "KI Translator KMU"

---

## Coding Conventions

- All components: functional, no class components; arrow-function style enforced (`func-style: expression`)
- Server vs Client: prefer Server Components, add `"use client"` only when needed (interactivity, hooks)
- Error handling: always handle loading + error states in UI
- Imports: use `@/*` alias only — relative `../` / `./` imports are an ESLint error (`no-restricted-imports`); import order is auto-sorted (`simple-import-sort`)
- Types: `type` over `interface` (`@typescript-eslint/consistent-type-definitions`), inline type imports (`import { type Foo }`)
- `console.log` is a lint warning; `console.warn`/`console.error` are allowed
- Formatting is Prettier-owned (single quotes, semicolons, 100 col, ES5 trailing commas) — don't hand-format against it
- `components/ui/**` (shadcn-generated) is excluded from ESLint — don't hand-edit its style to match the rest of the repo, treat it as vendored
- Comments: always English, even though UI copy is German. Explain _why_, not _what_ — especially around AI provider choice and EU AI Act compliance logic. State the durable reason the code is this way, not the story of a bug that led here (that belongs in the commit message, not the code)
- Commits: gitmoji (e.g. `✨ add translate route`, `🐛 fix language detection`, `♻️ refactor provider switch`)
