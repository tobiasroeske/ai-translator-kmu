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
- [x] `app/dashboard/translate.tsx`: `useObject`-UI (ersetzt `app/dashboard/chat.tsx`)
- [x] `lib/ai/auth-fetch.ts`: `fetchWithAuthError` angelegt (ersetzt `lib/ai/chat-transport.ts`)
- [x] `app/dashboard/page.tsx`: Chat-UI durch Übersetzer-UI ersetzt; `chat.tsx`/`chat-transport.ts`/`app/api/chat/route.ts` gelöscht
- [x] Prompt geschärft (`system`/`prompt`-Trennung) — Ollama (qwen2.5:7b) neigte ohne explizite Negativ-Anweisungen zu Meta-Kommentaren/Zusatzübersetzungen im `translatedText`-Feld
- [x] FA-05: `components/ai-generated-badge.tsx` angelegt und in `translate.tsx` eingebunden
- [x] Cleanup: verbleibende Anthropic-Referenzen (README, `CLAUDE.md`, `docker-compose.yml`) — CI-Workflow hatte keine
- [x] Abnahme: `pnpm ci:test` grün, manueller End-to-End-Test (Login → Übersetzung mit Sprach-Erkennung, auch mit langem Text getestet)

## Phase B — Soll-Kriterien (FA-06, FA-08, FA-10, FA-09, FA-07)

- [x] FA-06: `lib/ai/languages.ts` (DE/EN/FR/PL), Select in `translate.tsx` datengetrieben erweitert
- [x] Nebenbei: A11y-Verbesserungen (`Field`/`FieldLabel`/`FieldError`), stilles Fehlschlagen bei Provider-Ausfall behoben (`onFinish` + `onError`)
- [x] FA-02 (nachgeschärft, nach Feedback zu Phase 1): Erkennung auf den FA-06-Sprachkatalog begrenzt. Zweistufig: `lib/ai/detect-language.ts` erkennt (schneller, nicht-gestreamter Call), erst bei Katalog-Treffer (`isSupportedLanguageCode()`) startet der Übersetzungs-Call. Bei Nicht-Treffer: `422` von der Route, `translate.tsx` liest den Fehlertext zurück und öffnet `UnsupportedLanguageDialog` — es wird gar nicht erst übersetzt. Einzelner Enum-/Prompt-Call wurde gemessen und verworfen (qwen2.5:7b: IT-Langtext → `de`, PT → `fr`); Begründung + Messwerte in `CLAUDE.md`
- [x] Nebenbei: `temperature: 0.2` in der Translate-Route — Provider-Default (~0.8) führte zu Ausgaben in völlig fremden Sprachen
- [x] FA-08: `lib/ai/tone.ts` (formal/informal/neutral, Default neutral), Ton-Select in `translate.tsx`, Prompt-Schritt 2 in `app/api/translate/route.ts`. Type-Guards für die Selects (`createEnumGuard` in `lib/utils.ts`, generisch statt `as`-Cast pro Select) statt unsicherer Casts
- [x] Bug gefunden + behoben: `tone: 'informal'` brach die Übersetzung nach der Anrede ab (JSON-String wurde vorzeitig geschlossen). Ursache: die Ton-Instruktion zitierte Beispielphrasen (`"Hi,"` etc.) in Anführungszeichen — unter grammatikbeschränkter JSON-Ausgabe ist ein schließendes Anführungszeichen an jeder Stelle syntaktisch gültig, ein Beispiel, das dem gerade generierten Text ähnelt, zieht ein kleines Modell dazu, das Muster zu vervollständigen. Reproduziert (3/3) und Fix verifiziert (9/9, alle drei Töne) direkt gegen Ollama. Fix: Register wird jetzt beschrieben statt mit Zitaten bebildert, plus explizite Vollständigkeits-/Absatzstruktur-Anweisung in Prompt-Schritt 3
- [x] Nebenbei: Loading-Spinner (`Loader2`, `lucide-react`) im Button + Card-Header, solange kein `translatedText` gestreamt wird
- [x] FA-10: `components/translation-disclaimer.tsx` angelegt, neben `AiGeneratedBadge` in `translate.tsx` eingebunden (nur sichtbar sobald `aiGenerated` gesetzt ist)
- [x] FA-09: `supabase` als lokale devDependency, `supabase init` + `supabase/config.toml`
- [x] FA-09: Migration `supabase/migrations/20260807094319_create_translations.sql` (Tabelle: `user_id`/`source_language` `not null`, `created_at timestamptz`; Index auf `(user_id, created_at desc)`; RLS mit separaten select/insert/delete-Policies über `auth.uid() = user_id`, kein update — siehe FA-07). Per `supabase link` + `supabase db push` gegen die Remote-Instanz angewendet (kein lokales Docker-Supabase nötig — NFA-01 bezieht sich nur auf den AI-Provider)
- [x] FA-09: `onFinish`-Callback in `app/api/translate/route.ts` schreibt Übersetzung in DB. Generierte DB-Typen (`supabase gen types` → `lib/supabase/database.types.ts`), beide Supabase-Clients auf `<Database>` typisiert — falscher Tabellen-/Spaltenname oder fehlende Pflichtspalte sind damit Compile-Fehler statt Laufzeitfehler
- [x] Nachtrag-Migration `20260807103907_grant_translations_privileges.sql`: `grant select, insert, delete ... to authenticated`. GRANT (Tabellenebene) und RLS (Zeilenebene) sind in Postgres getrennte Schichten — ohne GRANT scheitert jeder Insert mit `42501`, bevor überhaupt eine Policy ausgewertet wird
- [x] Fehlerbehandlung vereinheitlicht: Toasts (`sonner`) statt inline `FieldError`-Boxen, `parseTranslateError` klassifiziert den Response-Body einmal zentral (`unsupported-language` | `auth` | `generic`), roher `error.message` erreicht die UI nicht mehr. `detectLanguage()` in der Route gekapselt → sauberes JSON mit `502` statt HTML-500 bei nicht erreichbarem Provider
- [x] FA-09: `app/dashboard/history/page.tsx` (Server Component, liest direkt via Supabase, kein RLS-Filter im Code nötig — die select-Policy scopet bereits auf die Session). `TranslationDisclaimer` einmal für die Liste, `AiGeneratedBadge` pro Eintrag (FA-05 muss am Output selbst stehen, FA-10 qualifiziert die Seite)
- [x] FA-09: Nav-Link "Verlauf" in `app/dashboard/layout.tsx` (`components/dashboard-nav.tsx`, aktiver Zustand via `usePathname`)
- [x] Nebenbei: Zweispaltiges Layout in `translate.tsx` (Quelltext/Übersetzung nebeneinander statt untereinander), Dashboard-Container auf `max-w-6xl`
- [x] Nebenbei: Übersetzungs-State (`useObject` + Formularfelder) aus `translate.tsx` in `components/translate-provider.tsx` gehoben (Next.js-Context-Provider-Pattern, Provider sitzt in `app/dashboard/layout.tsx` um `{children}`) — vorher unmountete `translate.tsx` beim Wechsel zu "Verlauf" und eine laufende Übersetzung ging verloren; jetzt übersteht der Stream die Navigation, weil der Context eine Ebene über dem gerouteten Content liegt
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

- [x] Wortlaut FA-05-Label final ("⚠ Diese Übersetzung wurde KI-generiert (kein menschliches Lektorat).")
- [x] Wortlaut FA-10-Disclaimer final ("Diese Übersetzung wurde maschinell erstellt und ist unverbindlich. Für rechtsverbindliche Übersetzungen wenden Sie sich an eine vereidigte Übersetzerin/einen vereidigten Übersetzer.")
- [x] Mistral-Model-Slug verifiziert (`mistral-small-latest`, via Vercel AI SDK Docs)
- [ ] `MISTRAL_API_KEY` verfügbar und `AI_PROVIDER=mistral` getestet
