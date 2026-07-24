# Fortschritts-Checkliste

Wird laufend aktualisiert — Referenz für den aktuellen Umsetzungsstand von FA-01–FA-12. Details/Begründungen im Plan unter `~/.claude/plans/alles-klar-wir-k-nnen-distributed-gadget.md` bzw. in `CLAUDE.md`.

## Schritt 0 — Vorbereitung

- [x] `CLAUDE.md`: Abschnitt "Arbeitsweise mit Claude Code" ergänzt
- [x] `docs/progress-checklist.md` angelegt

## Phase A — Muss-Kriterien (FA-01, FA-02, FA-03, FA-04-Verdrahtung, FA-05)

- [x] `lib/ai/provider.ts`: Ollama-Zweig übernommen, `anthropic`-Stub entfernt, `mistral`-Zweig ergänzt; `lib/provider/` gelöscht
- [x] `@ai-sdk/mistral` als Dependency ergänzt
- [x] `.env.local.example`: `MISTRAL_API_KEY` ergänzt, `ANTHROPIC_API_KEY` entfernt, Kommentare aktualisiert
- [x] `lib/ai/schema.ts`: `translationSchema` angelegt
- [x] `app/api/translate/route.ts`: `streamText` + `Output.object`-Route (ersetzt `app/api/chat/route.ts` später; `streamObject` ist in `ai` v6+ deprecated, siehe `CLAUDE.md`)
- [x] shadcn-Komponenten ergänzt: `textarea`, `select`, `card`
- [ ] `app/dashboard/translate.tsx`: `useObject`-UI (ersetzt `app/dashboard/chat.tsx`)
- [ ] `lib/ai/auth-fetch.ts`: `fetchWithAuthError` (ersetzt `lib/ai/chat-transport.ts`)
- [ ] `app/dashboard/page.tsx`: Chat-UI durch Übersetzer-UI ersetzt
- [ ] FA-05: `components/ai-generated-badge.tsx` + Wortlaut final abgestimmt
- [x] Cleanup: verbleibende Anthropic-Referenzen (README, `CLAUDE.md`, `docker-compose.yml`) — CI-Workflow hatte keine
- [ ] Abnahme: `pnpm ci:test` grün, manueller End-to-End-Test (Login → Übersetzung mit Sprach-Erkennung + Label)

## Phase B — Soll-Kriterien (FA-06, FA-08, FA-10, FA-09, FA-07)

- [ ] FA-06: `lib/ai/languages.ts` (DE/EN/FR/ES + optional PL), Select in `translate.tsx` erweitert
- [ ] FA-08: `lib/ai/tone.ts`, Ton-Parameter in Route + UI
- [ ] FA-10: `components/translation-disclaimer.tsx` + Wortlaut final abgestimmt
- [ ] FA-09: `supabase init` + `supabase/config.toml`
- [ ] FA-09: Migration `supabase/migrations/<timestamp>_create_translations.sql` (Tabelle + RLS-Policies)
- [ ] FA-09: `onFinish`-Callback in `app/api/translate/route.ts` schreibt Übersetzung in DB
- [ ] FA-09: `app/dashboard/history/page.tsx` (Historie-Liste)
- [ ] FA-09: Nav-Link "Verlauf" in `app/dashboard/layout.tsx`
- [ ] FA-07: Segmentierung (Absatzgrenzen) + `retranslateSchema`
- [ ] FA-07: `app/api/retranslate/route.ts`
- [ ] FA-07: Segment-Kommentar-UI in `translate.tsx`
- [ ] Abnahme: `pnpm ci:test` grün, manueller Test aller Phase-B-Funktionen

## Phase C — Kann-Kriterien (FA-12, FA-11)

- [ ] FA-12: `components/copy-button.tsx`, Einbindung in `translate.tsx` + `history/page.tsx`
- [ ] FA-11: PDF-Library final bestätigt (Empfehlung: `jspdf`)
- [ ] FA-11: PDF-Export inkl. KI-Label + Disclaimer im Dokument
- [ ] Abnahme: `pnpm ci:test` grün, manueller Test (Kopieren + PDF-Export)

## Offene Entscheidungen (bei Bedarf hier abhaken sobald final)

- [ ] Wortlaut FA-05-Label final
- [ ] Wortlaut FA-10-Disclaimer final
- [x] Mistral-Model-Slug verifiziert (`mistral-small-latest`, via Vercel AI SDK Docs)
- [ ] `MISTRAL_API_KEY` verfügbar und `AI_PROVIDER=mistral` getestet
