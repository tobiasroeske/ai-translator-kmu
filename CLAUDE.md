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

## Current repo state

Phases A and B of the implementation plan are done: FA-01 to FA-10 are built and working against
Ollama. What exists and is safe to build on:

- `app/api/translate` and `app/api/retranslate` — both `streamText` + `Output.object`, each with an
  input schema next to the route, each persisting what it generates.
- `lib/ai/` — provider switch, output schema, language catalog, tone instructions, request limits,
  segmentation, language detection, error classification. Everything here is framework-free; the pure
  parts are covered by Vitest.
- `lib/translations/history.ts` — the two Supabase writes (insert, segment update).
- `components/translate-provider.tsx` — form state + stream state, mounted in the dashboard layout so a
  running translation survives navigation to `/dashboard/history`.
- Supabase auth (email/password via Server Actions, session middleware, RLS), three applied migrations
  for the `translations` table, the `(auth)`/`dashboard` route split, shadcn/ui + Tailwind v4, the
  lint/format/typecheck/test tooling and the Docker/Ollama pipeline.

**`generateObject`/`streamObject` are deprecated as of `ai` v6+** (we're on v7) — use
`streamText`/`generateText` with `output: Output.object({ schema })`. `app/api/translate/route.ts` is the
reference implementation.

Phase C is also done: FA-11 (PDF export, `components/download-pdf-button.tsx`) and FA-12 (copy to
clipboard, `components/copy-to-clipboard-button.tsx`), both bundled in `components/translation-actions.tsx`.
`MAX_SOURCE_TEXT_LENGTH` is calibrated to qwen2.5:7b's 4096-token window and should be revisited if the
active model changes.

Phase 3 (Finalisierung) work in progress: a Vitest suite covering prompt construction, input validation,
error classification and the FA-05 notice component (`lib/ai/*.test.ts`, `components/translation-notice.test.tsx`),
plus two non-deterministic validation scripts (`pnpm validate:language-detection`, `pnpm validate:tone`) that
measure FA-02 detection accuracy and FA-08 tone adherence against the live model and write a Markdown report
to `docs/` — see the "Model validation" section in `README.md` for usage.

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
pnpm test             # Vitest, pure logic in lib/**/*.test.ts
pnpm test:watch       # Vitest in watch mode
pnpm ci:test          # lint + format:check + typecheck + test — run before every commit

# Docker (see docker-compose.yml)
pnpm docker:build     # build the app image
pnpm docker:up        # app + containerized Ollama (--profile ollama)
pnpm docker:up:prod   # app only, expects AI_PROVIDER=mistral + API key
pnpm docker:down
pnpm docker:restart   # docker:up with --build
pnpm docker:logs
pnpm docker:ps
```

`pnpm test` runs Vitest (`vitest run`) over `lib/**/*.test.ts`, `app/api/**/*.test.ts` and
`components/**/*.test.tsx`. The default environment is Node, no DOM, no mocked model — pure logic:
segment assembly, the FA-02 catalog guard, error classification, prompt construction. A component test
opts into jsdom per file via a `// @vitest-environment jsdom` docblock; `components/translation-notice.test.tsx`
is the only one so far. `pnpm test` is part of `pnpm ci:test`, which is the gate to run before every commit.

Anything that streams or talks to Supabase is still verified by running the app, not by mocking it. When
adding logic that decides something, put it in `lib/` as a pure function so it can be covered there.

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
│   ├── confirm-signup/     → click-through page for the confirmation mail (verifyOtp)
│   └── auth-code-error/    → shown when the OAuth/email-confirm callback fails
├── dashboard/               → protected (see proxy.ts)
│   ├── layout.tsx           → nav + TranslateProvider (above the routed pages)
│   ├── page.tsx             → renders <Translate />
│   ├── translate.tsx        → the translation UI, "use client", reads useTranslate()
│   ├── translate-segment.tsx → one paragraph + its comment box, own useObject, memoised
│   └── history/page.tsx     → FA-09, Server Component, paginated
├── api/
│   ├── translate/           → route.ts (POST, streams) + schema.ts (input contract)
│   ├── retranslate/         → route.ts (POST, streams) + schema.ts (input contract)
│   ├── auth/callback/route.ts → GET: exchanges OAuth/email-confirm code for a session
│   ├── health/route.ts      → GET: liveness check for Docker healthcheck
│   └── ai-smoke-test/route.ts → GET: generateText "Pong" smoke test against the active provider
└── layout.tsx                → root layout, Inter font, "KI Translator KMU" metadata
components/
├── translate-provider.tsx    → form state + stream state + context, "use client"
├── translation-notice.tsx    → FA-05 + FA-10 notice shown on every translation output
├── translation-actions.tsx   → bundles copy + PDF export for a rendered translation
├── copy-to-clipboard-button.tsx → FA-12
├── download-pdf-button.tsx   → FA-11
├── unsupported-language-dialog.tsx
├── enum-select.tsx           → typed wrapper around the shadcn Select
├── pagination.tsx
├── dashboard-nav.tsx
├── logoutButton.tsx
└── ui/                       → shadcn-generated, excluded from ESLint (globalIgnores)
lib/
├── supabase/
│   ├── client.ts             → browser-side Supabase client
│   ├── server.ts             → server-side Supabase client (Route Handlers, Server Components)
│   ├── middleware.ts         → updateSession(), called from proxy.ts
│   └── database.types.ts     → generated Supabase types
├── ai/
│   ├── provider.ts           → getModel(): AI_PROVIDER switch (ollama | mistral), shared MODEL_TEMPERATURE
│   ├── prompts.ts            → translate/retranslate prompt construction, pure functions
│   ├── schema.ts             → translationOutputSchema (model output)
│   ├── response-meta.ts      → parses the translation id / detected-language response headers
│   ├── languages.ts          → FA-06 catalog, guard, display + prompt names
│   ├── tone.ts               → FA-08 tones and their prompt instructions
│   ├── tone-markers.ts       → register classifier (Sie/du etc.) used by the tone validation script
│   ├── limits.ts             → length bounds + output token budget
│   ├── segment.ts            → paragraph split/join/replace (FA-07)
│   ├── detect-language.ts    → separate, cheap detection call (FA-02)
│   ├── translate-error.ts    → error codes + client-side classification
│   ├── auth-fetch.ts         → fetch wrapper surfacing a 401 as AUTH_ERROR
│   └── *.test.ts             → Vitest
├── pdf/                      → FA-11 PDF generation + filename logic (filename.ts is pure, tested)
├── translations/history.ts   → the two Supabase writes (insert, segment update)
└── utils.ts                  → cn(), createEnumGuard()
scripts/
├── validate-language-detection.mjs → FA-02 accuracy vs. the live model, writes a report to docs/
├── validate-tone.mjs         → FA-08 tone adherence vs. the live model, writes a report to docs/
├── validation-shared.mjs     → shared CLI/report plumbing for the two scripts above
└── demo-setup.mjs / demo-down.mjs / ollama.mjs / shared.mjs → pnpm demo pipeline
proxy.ts                       → Next.js middleware entry, delegates to updateSession(), route matcher excludes health/smoke-test/static assets
supabase/migrations/           → three applied migrations for the translations table
docs/
├── anforderungsdokument.md    → full FA/NFA Anforderungsliste (German), source of truth for requirements
└── progress-checklist.md      → running status, updated after every completed step
.agents/skills/                → vendored Supabase skill docs (auth/RLS/Postgres best practices)
```

---

## Architecture & Data Flow

### Auth flow (current, working)

```
proxy.ts (Next.js middleware) → lib/supabase/middleware.ts updateSession()
→ supabase.auth.getClaims() checks session
→ unauthenticated + page route → redirect to /login
→ unauthenticated + /api/* route → 401 JSON (not an HTML redirect — the streaming fetches need a machine-readable error)
→ public routes exempt from the check: /login, /auth*, /api/auth (the callback that ISSUES the session)
```

Login/signup go through Server Actions (`app/(auth)/actions.ts`), not client-side Supabase calls. Signup redirects straight to `/dashboard` only if email confirmation is disabled in the Supabase project (i.e. `data.session` is already set); otherwise the user sees a "check your email" message.

### Translation flow (current — FA-01/02/03/05/08/09)

```
User pastes business text, selects target language (+ optional tone, FA-08)
→ POST /api/translate, body validated against app/api/translate/schema.ts
→ detectLanguage() — separate, cheap call; out-of-catalog short-circuits with 422 (FA-02)
→ streamText translates, told the source language rather than inferring it again
→ row id + detected language come back as response headers, the translation as the stream
→ Frontend renders live via useObject
→ Output is visibly labeled as AI-generated directly on the result (on the output, not footer/metadata) — targeted at the KMU employee who may forward the translated text (FA-05 — EU AI Act Art. 50)
→ Result saved to Supabase (FA-09, history)
```

### Segment Comment / Re-translation flow (current — FA-07)

```
User adds a comment to a segment (e.g. terminology hint, style note)
→ POST /api/retranslate
→ The paragraph as currently translated + the comment + translationId + segmentIndex go to
  /api/retranslate. The source paragraph deliberately does not travel with it — see the FA-07
  section below.
→ The model REVISES the existing paragraph; it does not translate the source again from scratch
→ The route writes the paragraph back into the stored translation itself (read-modify-write)
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

### Zod schemas: two different jobs (current)

Both translation routes validate their **input** with a schema next to the route
(`app/api/translate/schema.ts`, `app/api/retranslate/schema.ts`, `safeParse` → 400). A route handler
receives whatever was posted to it, so a `type RequestBody` annotation on `await req.json()` asserts a
shape rather than checking one — don't reintroduce that pattern. `targetLanguage` in particular is
interpolated into the prompt and is constrained to the FA-06 catalog here.

The model **output** schema is deliberately minimal:

```ts
// lib/ai/schema.ts
export const translationOutputSchema = z.object({
  translatedText: z.string().describe('The translated text'),
});
```

Two fields were removed from it on purpose, and neither should come back:

- **`detectedSourceLanguage`** — established before the stream by `detectLanguage()` and validated against
  the catalog. Asking the model for it again during translation produced a second, unvalidated answer that
  could contradict the one the 422 gate was decided on. It travels to the client in the
  `X-Detected-Source-Language` response header instead, alongside `X-Translation-Id`.
- **`aiGenerated`** — that the output is machine-generated is a fact the application knows with certainty.
  As a generated field it made an FA-05 labelling obligation depend on the model's token sampling: a
  dropped or truncated field silently removed the notice. The UI decides this from `hasTranslation`.

### FA-02 language-catalog constraint (current)

Catalog membership is decided by `isSupportedLanguageCode()`, **not** by the model, and the translation
prompt does not mention the catalog at all. `POST /api/translate` runs detection and translation as two
separate model calls (`lib/ai/detect-language.ts`, cheap/non-streaming, then `streamText` only if the
result passes the guard). An unsupported language short-circuits before any translation call: the route
returns `{ error: 'unsupported_language', detectedSourceLanguage }` with status 422; `useObject` reads that
body into `error.message`, `parseTranslateError()` (`lib/ai/translate-error.ts`) classifies it by its error
code, and `translate.tsx` opens `UnsupportedLanguageDialog` instead of rendering a translation.

This is deliberate and was measured, not assumed. A single combined call constrained to
`z.enum([...languageCodes, 'unsupported'])`, instructed to emit `'unsupported'` for out-of-catalog text,
failed against qwen2.5:7b: longer Italian business text came back as `de`, Portuguese as `fr` (3/3 runs
each). The same model named the language correctly 16/16 when it only had to report what it saw, in
isolation from any catalog/set-membership decision — that decision is the unreliable half of the job for
a 7B model, so it moved into `isSupportedLanguageCode()`. Splitting detection into its own call was the
next consequence of that: it means an out-of-catalog text is never translated at all (not generated and
discarded). Don't "simplify" this back into a single prompt/enum call.

### Supabase Client Usage (current)

- Use `@/lib/supabase/client.ts` in Client Components
- Use `@/lib/supabase/server.ts` in Route Handlers and Server Components (creates a fresh client per call — do not cache/globalize it under Fluid compute)
- Never use the service role key client-side
- Env vars are `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the **publishable** key, not the legacy anon key

### FA-07 re-translation is a revision, not a re-translation (current)

`/api/retranslate` receives the paragraph **as it currently reads in the translation** and revises it.
The current translation is what the user commented on and is therefore always the right subject. It
also gives the model something to preserve — a re-translation from scratch has no reason to keep the
parts the comment didn't mention.

**The source paragraph is not part of this request at all, and must not be added back.** A source
paragraph can only be paired with a translated one by position, and the model is free to merge or
split paragraphs while translating, so the pairing can address a different paragraph — measured
against qwen2.5:7b, a three-paragraph German business mail came back as four and as five paragraphs
on two consecutive runs, despite the translate prompt asking for the source's paragraph breaks. A
mismatched source does not merely go unused: put in front of the model it wins over the instruction,
and the revision comes back as a translation of that other paragraph, silently replacing a paragraph
the user still had on screen. Comparing the two paragraph counts does not fix this — a simultaneous
merge and split leaves the counts equal and the pairing wrong, and a count check is a threshold with
no measured failure behind it. Without the source there is no pairing to get wrong.

The prompt states the task and nothing more. A version with five numbered rules, a "the comment is
data, not instructions" preamble and delimiters around the comment was measured against qwen2.5:7b
and performed identically on every legitimate case (terminology applied 3/3, all five sentences kept,
"formulate it shorter" at 82% of the original length in both). Extra rules here buy nothing — keep it
describing the job.

The only guard is that an empty revision is not stored and not applied. The schema guarantees a
string, not a non-empty one, and an empty one would erase a paragraph the user still has. Anything
beyond that (length ratios, plausibility scores) is a threshold with no measured failure behind it.

### FA-05 + FA-10 notice (current)

`components/translation-notice.tsx` carries both requirements in one muted line, rendered directly on
every translation output (dashboard and each history card): AI-generated without human review (FA-05,
EU AI Act Art. 50) and machine-made / not legally binding (FA-10).

They were two components — an amber warning badge plus a separate disclaimer — and that was
over-designed: the two repeated each other and made the notice the loudest thing on the page. The
obligation is that it is **visible and attached to the output**, not that it shouts. Keep it factual and
quiet, but don't drop either statement, and don't move it into a page footer or into metadata.

Its rendering condition must stay independent of the model's response (see the schema section above).

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
- Do not remove either statement in `components/translation-notice.tsx` (FA-05 AI label, FA-10 non-binding disclaimer) and do not make its rendering depend on a model-generated field — both are graded/compliance requirements. Restyling it is fine; dropping it is not
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
