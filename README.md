# KI Translator KMU

AI-powered business text translator built as the practical demonstrator for the university module **DLBFMPGKIU01** ("Projekt: Generative KI im Unternehmenskontext"), Aufgabe 1.

Users paste business text (emails, internal documents, notes), the system auto-detects the source language, and streams a translation back — with an AI Act–compliant "AI-generated" label and a non-binding disclaimer.

> **Fictional framing:** a start-up offering AI translation solutions to SMEs (KMU) in the DACH region.

For the full requirements list (FA/NFA) that drives scope decisions, see [`docs/anforderungsdokument.md`](docs/anforderungsdokument.md).

## Tech Stack

| Layer              | Technology                                       |
| ------------------ | ------------------------------------------------ |
| Framework          | Next.js 16 (App Router)                          |
| Language           | TypeScript (strict)                              |
| Styling            | Tailwind CSS v4 + shadcn/ui                      |
| AI Abstraction     | Vercel AI SDK (`ai`)                             |
| AI Provider (dev)  | Ollama (`qwen2.5:7b`) — local, no API costs      |
| AI Provider (prod) | Anthropic (target: Mistral Small, see CLAUDE.md) |
| Database + Auth    | Supabase (PostgreSQL)                            |
| Deployment         | Vercel                                           |
| Package Manager    | pnpm (pinned via `packageManager`)               |
| Node               | pinned via `.nvmrc`                              |

## Prerequisites

- Node (version pinned in [`.nvmrc`](.nvmrc) — use `nvm use`)
- pnpm (version pinned in `package.json#packageManager` — `corepack enable` will pick it up automatically)
- [Ollama](https://ollama.com) installed natively, **or** Docker — for local AI inference without API costs
- A [Supabase](https://supabase.com) project (free tier is enough) for auth

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in your Supabase project URL and publishable key (Supabase Dashboard → Project Settings → API). Leave `AI_PROVIDER=ollama` for local development — no API key required.

### 3. Start the AI provider

**Option A — native Ollama (recommended for local dev):**

```bash
ollama pull qwen2.5:7b
ollama serve
```

**Option B — containerized Ollama (zero local setup, see [Docker](#docker)):**

```bash
pnpm docker:up
```

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
pnpm dev              # start dev server (Turbopack)
pnpm build            # production build
pnpm start            # run the production build
pnpm lint             # ESLint
pnpm format           # Prettier --write
pnpm format:check     # Prettier --check
pnpm typecheck        # tsc --noEmit
pnpm ci:test          # lint + format:check + typecheck — run before every commit
```

There is no test suite configured yet — `pnpm ci:test` is the closest thing to a merge gate.

## Docker

The Dockerfile is a multi-stage production build (Next.js `standalone` output) primarily used for local self-hosted demos and CI image validation — actual deployment targets Vercel, which builds from source directly.

```bash
pnpm docker:build     # build the app image
pnpm docker:up        # app + containerized Ollama (local AI, zero setup)
pnpm docker:up:prod   # app only — requires AI_PROVIDER=anthropic + ANTHROPIC_API_KEY in .env.local
pnpm docker:down
pnpm docker:restart   # docker:up with --build
pnpm docker:logs
pnpm docker:ps
```

The app exposes `GET /api/health` for container healthchecks.

## Project Structure

See [`CLAUDE.md`](CLAUDE.md) for a detailed breakdown of the folder structure, architecture, and current implementation status against the target design.

## License

Private academic project — not licensed for reuse.
