# KI Translator KMU

AI-powered business text translator built as the practical demonstrator for the university module **DLBFMPGKIU01** ("Projekt: Generative KI im Unternehmenskontext"), Aufgabe 1.

Users paste business text (emails, internal documents, notes), the system auto-detects the source language, and streams a translation back — with an AI Act–compliant "AI-generated" label and a non-binding disclaimer.

> **Fictional framing:** a start-up offering AI translation solutions to SMEs (KMU) in the DACH region.

For the full requirements list (FA/NFA) that drives scope decisions, see [`docs/anforderungsdokument.md`](docs/anforderungsdokument.md).

## Tech Stack

| Layer              | Technology                                                 |
| ------------------ | ---------------------------------------------------------- |
| Framework          | Next.js 16 (App Router)                                    |
| Language           | TypeScript (strict)                                        |
| Styling            | Tailwind CSS v4 + shadcn/ui                                |
| AI Abstraction     | Vercel AI SDK (`ai`)                                       |
| AI Provider (dev)  | Ollama (`qwen2.5:7b`) — local, no API costs                |
| AI Provider (prod) | Mistral Small (`mistral-small-latest`) — EU data residency |
| Database + Auth    | Supabase (PostgreSQL)                                      |
| Deployment         | Vercel                                                     |
| Package Manager    | pnpm (pinned via `packageManager`)                         |
| Node               | pinned via `.nvmrc`                                        |

## Prerequisites

- Node (version pinned in [`.nvmrc`](.nvmrc) — use `nvm use`)
- pnpm (version pinned in `package.json#packageManager` — `corepack enable` will pick it up automatically)
- [Docker](https://www.docker.com/products/docker-desktop/), running

No accounts, API keys or Supabase project required.

## Quick Start (evaluation / demo)

```bash
pnpm install
pnpm demo
```

Open [http://localhost:3000](http://localhost:3000) and choose **„Als Gast anmelden"** — no registration, no email address.

Runs on macOS, Linux and Windows.

`pnpm demo` ([`scripts/demo-setup.mjs`](scripts/demo-setup.mjs)) does everything else:

| Step        | What happens                                                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase    | The full stack starts locally in Docker via the Supabase CLI. Everything in `supabase/migrations` is applied, so the `translations` table and its RLS policies exist.                     |
| Credentials | The local stack's URL and publishable key are written to `.env.development.local` — generated, gitignored, never committed.                                                               |
| AI          | Uses a natively installed Ollama when one is running; otherwise starts the Ollama container. Either way `qwen2.5:7b` is pulled if missing (~4.7 GB on first run — that is the slow part). |

The model and the database are local — no request leaves your machine.

Tear it down again with:

```bash
pnpm demo:down             # stop everything, keep the data volumes
pnpm demo:down -- --purge  # also delete the local database and the container's model volume
```

A natively installed Ollama is never touched by either command.

## Live Demo (optional)

In addition to the local setup described above, a hosted version is available: [AI Translator Tool](https://ai-translator-kmu.vercel.app/login)

Operates with rate limiting; the primary proof of reproducibility remains `pnpm demo`.

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

pnpm validate:language-detection   # FA-02 detection accuracy against the live model
pnpm validate:tone                 # FA-08 tone adherence against the live model
```

`pnpm test` covers the pure logic in `lib/` (segment assembly, the language-catalog guard, error
classification, prompt construction) plus the FA-05 notice component. Anything that streams or talks
to Supabase is verified by running the app.

### Model validation

The two `validate:*` scripts measure model behaviour, which has no fixed expected value to assert,
so they run outside `pnpm test` and write a Markdown report instead of passing or failing. Both
default to Mistral (the production provider) and need `MISTRAL_API_KEY`; `--dry-run` checks the
pipeline without calling an API.

Each run writes its own timestamped file to `docs/validation/` (`tone-2026-09-11-10-25.md`), so a
run can be compared against the one before it after a prompt or dataset change. A `--dry-run` keeps
one fixed `-dry-run.md` name and overwrites only itself.

Because the provider is an abstraction (`lib/ai/provider.ts`), the same datasets run against the
local Ollama model with `--provider=ollama` — useful for comparing the two, though the recorded
reports are against Mistral.

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

`docker:up` pulls `qwen2.5:7b` before starting the app container.

## Project Structure

There is no `src/` directory — the `@/*` alias maps to the project root.

| Path                                         | Contents                                                                                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(auth)/`                                | Login and signup via Server Actions, plus the email-confirmation pages                                                                                                                 |
| `app/dashboard/`                             | The translation UI and the paginated history, behind the auth middleware                                                                                                               |
| `app/api/translate/`, `app/api/retranslate/` | Both stream via `streamText` + `Output.object`, each with its input schema alongside                                                                                                   |
| `lib/ai/`                                    | Provider switch, output schema, language catalog, tone instructions, segmentation, language detection, error classification — framework-free, and the pure parts are covered by Vitest |
| `lib/supabase/`                              | Browser and server clients, session middleware, generated types                                                                                                                        |
| `supabase/migrations/`                       | The `translations` table and its RLS policies                                                                                                                                          |
| `docs/anforderungsdokument.md`               | The FA/NFA requirements list that drives every scope decision                                                                                                                          |

## License

Private academic project — not licensed for reuse.
