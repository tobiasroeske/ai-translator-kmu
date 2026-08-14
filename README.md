# KI Translator KMU

AI-powered business text translator built as the practical demonstrator for the university module **DLBFMPGKIU01** ("Projekt: Generative KI im Unternehmenskontext"), Aufgabe 1.

Users paste business text (emails, internal documents, notes), the system auto-detects the source language, and streams a translation back — with an AI Act–compliant "AI-generated" label and a non-binding disclaimer.

> **Fictional framing:** a start-up offering AI translation solutions to SMEs (KMU) in the DACH region.

For the full requirements list (FA/NFA) that drives scope decisions, see [`docs/anforderungsdokument.md`](docs/anforderungsdokument.md).

## Tech Stack

| Layer              | Technology                                            |
| ------------------ | ----------------------------------------------------- |
| Framework          | Next.js 16 (App Router)                               |
| Language           | TypeScript (strict)                                   |
| Styling            | Tailwind CSS v4 + shadcn/ui                           |
| AI Abstraction     | Vercel AI SDK (`ai`)                                  |
| AI Provider (dev)  | Ollama (`qwen2.5:7b`) — local, no API costs           |
| AI Provider (prod) | Mistral Small (`mistral-small-latest`, see CLAUDE.md) |
| Database + Auth    | Supabase (PostgreSQL)                                 |
| Deployment         | Vercel                                                |
| Package Manager    | pnpm (pinned via `packageManager`)                    |
| Node               | pinned via `.nvmrc`                                   |

## Prerequisites

- Node (version pinned in [`.nvmrc`](.nvmrc) — use `nvm use`)
- pnpm (version pinned in `package.json#packageManager` — `corepack enable` will pick it up automatically)
- [Docker](https://www.docker.com/products/docker-desktop/), running

That is the whole list. No accounts, no API keys, no Supabase project — see below.

## Quick Start (evaluation / demo)

```bash
pnpm install
pnpm demo
```

Open [http://localhost:3000](http://localhost:3000) and choose **„Als Gast anmelden"** — no registration, no email address.

`pnpm demo` ([`scripts/demo-setup.sh`](scripts/demo-setup.sh)) does everything else:

| Step        | What happens                                                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase    | The full stack starts locally in Docker via the Supabase CLI. Everything in `supabase/migrations` is applied, so the `translations` table and its RLS policies exist.                     |
| Credentials | The local stack's URL and publishable key are written to `.env.development.local` — generated, gitignored, never committed.                                                               |
| AI          | Uses a natively installed Ollama when one is running; otherwise starts the Ollama container. Either way `qwen2.5:7b` is pulled if missing (~4.7 GB on first run — that is the slow part). |

Guest login works out of the box because `enable_anonymous_sign_ins = true` in [`supabase/config.toml`](supabase/config.toml), which configures the local stack.

Everything runs on your machine: the model is local, the database is local, and no request leaves the host.

Tear it down again with:

```bash
pnpm demo:down             # stop everything, keep the data volumes
pnpm demo:down -- --purge  # also delete the local database and the container's model volume
```

A natively installed Ollama is never touched by either command.

## Development against a hosted Supabase project

For work against the real project rather than the local stack:

```bash
cp .env.local.example .env.local   # fill in URL + publishable key
pnpm dev
```

`.env.local` is only in effect when no `.env.development.local` exists — Next.js ranks the latter higher. Run `pnpm demo:down` to remove it.

## Commands

```bash
pnpm demo             # one-command local demo (Supabase + Ollama + dev server)
pnpm demo:down        # stop it again (add -- --purge to drop the data volumes)
pnpm dev              # start dev server (Turbopack)
pnpm build            # production build
pnpm start            # run the production build
pnpm lint             # ESLint
pnpm format           # Prettier --write
pnpm format:check     # Prettier --check
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest — pure logic in lib/**/*.test.ts
pnpm ci:test          # lint + format:check + typecheck + test — run before every commit
```

`pnpm test` covers the pure logic in `lib/` (segment assembly, the language-catalog guard, error
classification). Anything that streams, renders, or talks to Supabase is verified by running the app.

## Docker

The Dockerfile is a multi-stage production build (Next.js `standalone` output) primarily used for local self-hosted demos and CI image validation — actual deployment targets Vercel, which builds from source directly.

```bash
pnpm docker:build     # build the app image
pnpm docker:up        # app + containerized Ollama (local AI, zero setup)
pnpm docker:up:prod   # app only — requires AI_PROVIDER=mistral + MISTRAL_API_KEY in .env.local
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
