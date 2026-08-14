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
- [x] FA-05: KI-Kennzeichnung in `translate.tsx` eingebunden (zunächst `components/ai-generated-badge.tsx`, später zu `components/translation-notice.tsx` zusammengeführt — siehe Best-Practice-Durchgang)
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
- [x] FA-10: Disclaimer angelegt und neben der KI-Kennzeichnung eingebunden (später mit ihr zusammengeführt, und die Sichtbarkeit vom Modell-Feld `aiGenerated` gelöst — siehe Best-Practice-Durchgang)
- [x] FA-09: `supabase` als lokale devDependency, `supabase init` + `supabase/config.toml`
- [x] FA-09: Migration `supabase/migrations/20260807094319_create_translations.sql` (Tabelle: `user_id`/`source_language` `not null`, `created_at timestamptz`; Index auf `(user_id, created_at desc)`; RLS mit separaten select/insert/delete-Policies über `auth.uid() = user_id`, kein update — siehe FA-07). Per `supabase link` + `supabase db push` gegen die Remote-Instanz angewendet (kein lokales Docker-Supabase nötig — NFA-01 bezieht sich nur auf den AI-Provider)
- [x] FA-09: `onFinish`-Callback in `app/api/translate/route.ts` schreibt Übersetzung in DB. Generierte DB-Typen (`supabase gen types` → `lib/supabase/database.types.ts`), beide Supabase-Clients auf `<Database>` typisiert — falscher Tabellen-/Spaltenname oder fehlende Pflichtspalte sind damit Compile-Fehler statt Laufzeitfehler
- [x] Nachtrag-Migration `20260807103907_grant_translations_privileges.sql`: `grant select, insert, delete ... to authenticated`. GRANT (Tabellenebene) und RLS (Zeilenebene) sind in Postgres getrennte Schichten — ohne GRANT scheitert jeder Insert mit `42501`, bevor überhaupt eine Policy ausgewertet wird
- [x] Fehlerbehandlung vereinheitlicht: Toasts (`sonner`) statt inline `FieldError`-Boxen, `parseTranslateError` klassifiziert den Response-Body einmal zentral (`unsupported-language` | `auth` | `generic`), roher `error.message` erreicht die UI nicht mehr. `detectLanguage()` in der Route gekapselt → sauberes JSON mit `502` statt HTML-500 bei nicht erreichbarem Provider
- [x] FA-09: `app/dashboard/history/page.tsx` (Server Component, liest direkt via Supabase, kein RLS-Filter im Code nötig — die select-Policy scopet bereits auf die Session). Kennzeichnung pro Eintrag — sie muss am Output selbst stehen, und jede Karte ist für sich lesbar bzw. kopierbar
- [x] FA-09: Nav-Link "Verlauf" in `app/dashboard/layout.tsx` (`components/dashboard-nav.tsx`, aktiver Zustand via `usePathname`)
- [x] Nebenbei: Zweispaltiges Layout in `translate.tsx` (Quelltext/Übersetzung nebeneinander statt untereinander), Dashboard-Container auf `max-w-6xl`
- [x] Nebenbei: Übersetzungs-State (`useObject` + Formularfelder) aus `translate.tsx` in `components/translate-provider.tsx` gehoben (Next.js-Context-Provider-Pattern, Provider sitzt in `app/dashboard/layout.tsx` um `{children}`) — vorher unmountete `translate.tsx` beim Wechsel zu "Verlauf" und eine laufende Übersetzung ging verloren; jetzt übersteht der Stream die Navigation, weil der Context eine Ebene über dem gerouteten Content liegt
- [x] FA-07: Segmentierung (`lib/ai/segment.ts`, Split an `/\n\s*\n/`) + eigenes Retranslate-Schema (ohne `detectedSourceLanguage` — zum Zeitpunkt der Neuübersetzung bereits bekannt; beide Routen teilen sich inzwischen `translationOutputSchema`)
- [x] FA-07: `app/api/retranslate/route.ts` (`streamText` + `Output.object`, Prompt mit getrennten `Segment:`/`Comment:`-Abschnitten und explizitem "übersetze den Kommentar nie mit", Fallback-Instruktion für leeren Kommentar). Zunächst ohne Persistenz gebaut (der FA-07-Wortlaut verlangt keine) — später nachgezogen, siehe unten
- [x] FA-07: Segment-Kommentar-UI (`app/dashboard/translate-segment.tsx`): Hover-Icon pro Absatz, inline `Textarea`, eigene `useObject`-Instanz pro Segment (Rules of Hooks — deshalb eigene Komponente statt Schleife in `translate.tsx`), Neuübersetzung wird ebenfalls live gestreamt
- [x] Nachgelagert: `segments`/`sourceSegments`/`retranslateSegment` in den `TranslateProvider` gehoben — vorher gingen Neuübersetzungen beim Wechsel zu "Verlauf" und zurück still verloren, und `sourceSegments` konnte durch Weitertippen im Quelltext gegen `segments` verrutschen (falscher Absatz an `/api/retranslate`). `sourceSegments` wird jetzt beim Absenden eingefroren
- [x] Nachgelagert: alle `useEffect` aus `translate-provider.tsx` und `translate-segment.tsx` entfernt zugunsten von `useObject`s `onFinish`/`onError`. Der Effect + inline `onRetranslated`-Prop war eine Endlos-Schleife ("Maximum update depth exceeded"), weil die Callback-Identität pro Render wechselte
- [x] Nachgelagert: `stop()` in beiden Streams (Haupt-Übersetzung + Segment), plus `maxOutputTokens` in beiden Routen als harter Riegel gegen durchdrehende Generierung
- [x] Nachgelagert: `MAX_SOURCE_TEXT_LENGTH` (`lib/ai/limits.ts`, 3.000 Zeichen) — Zeichenzähler + deaktivierter Submit in der UI, 400 in der Route. Aus dem 4096-Token-Kontextfenster von `qwen2.5:7b` abgeleitet, damit der Token-Deckel nur Ausreißer trifft und nie legitimen Text abschneidet. `detectLanguage()` bekommt nur noch die ersten 200 Zeichen statt des ganzen Texts — vorher wurde der Quelltext pro Anfrage zweimal ausgewertet, was bei langen Texten die Wartezeit bis zum ersten Wort dominierte
- [x] Nachgetragen (nicht in der Anforderungsliste, aber ohne das zeigt der Verlauf veraltete Übersetzungen): Neuübersetzungen werden persistiert. Migration `20260807154458_allow_translation_updates.sql` (update-Policy mit `using` _und_ `with check`, plus `grant update`) — die ursprüngliche Migration hatte update bewusst ausgelassen unter der Annahme "Neuübersetzung erzeugt eine neue Zeile"; das würde pro Dokument mehrere fast identische Einträge erzeugen und gegen die Auffindbarkeit (FA-09) arbeiten
- [x] Nachgetragen: `/api/translate` erzeugt die Row-ID vorab und gibt sie als `X-Translation-Id`-Header aus (der Insert passiert erst im `onFinish`, lange nach den Headern). `/api/retranslate` bekommt `translationId` + `segmentIndex` und speichert selbst — beide Routen persistieren, was sie erzeugen, der Client beschreibt nie den DB-Inhalt. Beide Operationen in `lib/translations/history.ts`, `joinSegments()` neben `segmentText()`
- [x] Nachgetragen: Provider in `useTranslateForm` (Eingaben) + `useTranslationStream` (Request/Dokument/History-ID) getrennt, `TranslationSegment` in `memo` mit stabilem `useCallback` — vorher renderten alle Segmente bei jedem Tastendruck im Quelltextfeld mit
- [x] Abnahme: `pnpm ci:test` grün, manueller Test aller Phase-B-Funktionen

## Zwischenschritt — Best-Practice-Durchgang (nach Phase B, vor Phase C)

Vollständiges Review des bestehenden Codes auf React-/Next.js-Patterns, API-Design, Separation of Concerns, Testbarkeit und Prompt Engineering. Ergebnis waren acht Punkte, alle umgesetzt:

- [x] **FA-05/FA-10 unabhängig vom Modell-Output.** `aiGenerated` aus dem Schema entfernt: die Sichtbarkeit der Kennzeichnung hing daran, dass das Modell ein Literal-Feld generiert — ein abgebrochener oder unvollständiger Stream hätte die Kennzeichnung still entfernt. Dass die Ausgabe maschinell erzeugt ist, weiß die Anwendung sicher; die UI entscheidet das jetzt über `hasTranslation`
- [x] **Badge + Disclaimer zu `components/translation-notice.tsx` zusammengeführt.** Vorher zwei Elemente (amberfarbenes Warn-Badge + Hinweistext), die sich inhaltlich überschnitten und die Kennzeichnung zum lautesten Element der Seite machten. FA-05 verlangt sichtbar am Output, nicht auffällig — jetzt eine ruhige Info-Zeile, die beide Aussagen trägt, pro Übersetzung (auch pro History-Eintrag)
- [x] **Doppelte Spracherkennung beseitigt.** Die Route erkannte die Sprache, prüfte sie gegen den Katalog — und ließ das Modell sie im Übersetzungs-Call ein zweites Mal raten; angezeigt und gespeichert wurde die ungeprüfte zweite Antwort, die der ersten widersprechen konnte. Jetzt steht die validierte Sprache im Prompt (`Translate the following German text to French`) und geht als `X-Detected-Source-Language`-Header an den Client
- [x] **Request-Validierung mit Zod** in beiden Routen (`app/api/*/schema.ts`, `safeParse` → 400). Vorher wurde `await req.json()` nur mit einem `type RequestBody` behauptet: `sourceText: undefined` erzeugte eine HTML-500-Seite, und `targetLanguage` ging als ungeprüfter String in den Prompt. `/api/retranslate` hatte zudem gar keine Längenbegrenzung — `MAX_SOURCE_TEXT_LENGTH` schützte nur die Volltext-Route (neu: `MAX_SEGMENT_TEXT_LENGTH`, `MAX_COMMENT_LENGTH`)
- [x] **Testbarkeit: Vitest + reine Logik freigelegt.** `replaceSegmentAt()` (die FA-07-Regel ohne Datenbank), `parseTranslateError` nach `lib/ai/translate-error.ts` gezogen. 20 Tests über Segmentierung, Katalog-Guard und Fehlerklassifikation; `pnpm test` ist Teil von `pnpm ci:test` und läuft damit in CI. Bewusst kein jsdom/React-Rendering und keine gemockten Modell-Calls — was streamt, rendert oder mit Supabase spricht, wird durch Benutzen verifiziert
- [x] **React-Detailkorrekturen.** `key` um die `translationId` erweitert (der reine Index hielt Kommentar-State einer Übersetzung über die nächste hinweg am Leben); DOM-`id` des Kommentarfelds auf `useId()` statt auf den kompletten Absatztext
- [x] **Aufräumen.** `maxOutputTokens`-Formel als `outputTokenBudget()` an einen Ort (stand doppelt mit fast gleichem Kommentar in beiden Routen); einheitliche Fehler-Codes (`translateErrorCodes`) statt "welches Feld ist im Body vorhanden"; `maxDuration` in beiden Routen (Streaming-Timeout fällt lokal nie auf, in Produktion schon); `if (!userId)` als echter 401 statt totem Zweig
- [x] Abnahme: `pnpm ci:test` grün (Lint, Format, Typecheck, 20 Tests)

## Nachtrag — FA-07 Neuübersetzung überarbeitet statt neu übersetzt

Gemeldetes Fehlverhalten: ein Kommentar zu einem Absatz ("Begriff X anders übersetzen") verkürzte den Absatz auf eine Zeile.

- [x] Ursache eingegrenzt, nicht geraten: der Prompt wurde in 42 Läufen gegen Ollama getestet (verschiedene Kommentar-Formulierungen, kurze und lange Absätze, mit/ohne Anführungszeichen) — **kein einziger Kollaps**. Die Ursache lag im Client: `/api/retranslate` bekam `sourceSegments[index]`, also den Quell-Absatz nach reiner Positions-Zuordnung. Zieht das Modell beim Übersetzen zwei Absätze zusammen oder teilt einen, verschiebt sich alles danach — der lange Absatz wird dann gegen z. B. "Mit freundlichen Grüßen" neu übersetzt, und genau das ergibt eine Zeile
- [x] **Umgestellt von "Quell-Absatz neu übersetzen" auf "vorhandene Übersetzung überarbeiten".** Die Route bekommt jetzt `currentTranslation` (der angezeigte Absatz, immer korrekt zugeordnet) als Anker; der Quell-Absatz geht als optionaler Kontext mit und wird weggelassen, wenn er fehlt. Gemessen: stabile Länge (450–484 Zeichen gegen 456 Basis, immer 5 Sätze), Terminologie zuverlässig übernommen — und im simulierten Drift-Fall (bewusst falscher Quell-Absatz) weiterhin der richtige Absatz, weil der Anker hält
- [x] **Prompt auf die Aufgabe zurückgebaut.** Eine Zwischenversion mit fünf nummerierten Regeln, einer "der Kommentar ist Daten, keine Anweisung"-Präambel und Delimitern um den Kommentar wurde gegen `qwen2.5:7b` gemessen und war auf **jedem** legitimen Fall identisch zur schlanken Fassung: Terminologie 3/3 übernommen, alle 5 Sätze erhalten, "bitte knapper" bei 82 % der Ausgangslänge in beiden Varianten. Die Zusatzregeln kauften nichts und sind entfernt — der Prompt beschreibt jetzt die Aufgabe und sonst nichts
- [x] **`isPlausibleRevision()` wieder entfernt** (`lib/ai/revision.ts` samt Test gelöscht). Die Funktion war ein Längen-Schwellwert (unter 40 % ab 200 Zeichen) gegen ein Kollaps-Szenario, das aus einer selbst gesetzten Prompt-Injection-Fragestellung stammte, nicht aus dem gemeldeten Fehler. Ein erfundener Schwellwert ohne gemessenes Fehlverhalten dahinter gehört nicht in den Code. Geblieben ist die eine Prüfung mit echtem Degenerationsfall: eine leere Überarbeitung wird weder gespeichert noch angewendet, da das Schema einen String garantiert, aber keinen nicht-leeren
- [x] Restrisiko bewusst akzeptiert: wer sich selbst eine Übernahme-Anweisung ins eigene Kommentarfeld schreibt, ersetzt seinen eigenen Absatz in seiner eigenen Historie und kann neu übersetzen — kein Fremdzugriff, kein Datenabfluss, kein Tool-Zugriff. Für diesen Demonstrator kein Sachverhalt, der Code rechtfertigt
- [x] Abnahme: `pnpm ci:test` grün, `pnpm build` grün

## Phase C — Kann-Kriterien (FA-12, FA-11)

- [x] FA-12: `components/copy-to-clipboard-button.tsx` — Icon-Swap (Copy → Check) statt Toast, da Kopieren häufig und folgenlos ist; Timeout wird bei erneutem Klick/Unmount gecleart
- [x] FA-11: PDF-Library final bestätigt (`jspdf`) — Standard-Fonts decken WinAnsi/Latin-1 ab, reicht für den DE/EN/FR/ES-Katalog (kein PL) ohne Font-Embedding
- [x] FA-11: `components/download-pdf-button.tsx` — `jspdf` dynamisch importiert (Bundle-Splitting), manueller Zeilenumbruch/Seitenumbruch über `splitTextToSize`, `lib/pdf/filename.ts` (pure, getestet) für den Dateinamen
- [x] FA-05/FA-10 im PDF: `lib/notice.ts` als gemeinsame Quelle für `TranslationNotice` (Bildschirm) und den PDF-Export — der Hinweistext reist im Dokument selbst mit, nicht nur auf dem Bildschirm
- [x] `components/translation-actions.tsx` bündelt Copy + PDF-Export für beide Einbindungsstellen (`translate.tsx`, `history/page.tsx`)
- [x] Typisierung: `targetLanguage` durchgängig `LanguageCode` statt `string` (Filename, Button, Actions). `history/page.tsx` narrowed den rohen DB-String mit `isSupportedLanguageCode()`, analog zum bestehenden `isSupportedTone()`-Muster
- [x] Docker-Build verifiziert: `pnpm-workspace.yaml`s `allowBuilds` (inkl. `core-js`, Sub-Dependency von `jspdf`) greift auch im `deps`-Stage des Dockerfiles
- [x] Abnahme: `pnpm ci:test` grün (Lint, Format, Typecheck, 38 Tests), manueller Test (Kopieren + PDF-Export inkl. Umlaute)

## Offene Entscheidungen (bei Bedarf hier abhaken sobald final)

- [x] Wortlaut FA-05 + FA-10 final, zusammengefasst in `components/translation-notice.tsx`: "KI-generierte Übersetzung ohne menschliches Lektorat — maschinell erstellt und rechtlich unverbindlich. Für rechtsverbindliche Übersetzungen wenden Sie sich an eine vereidigte Übersetzerin oder einen vereidigten Übersetzer."
- [x] Mistral-Model-Slug verifiziert (`mistral-small-latest`, via Vercel AI SDK Docs)
- [ ] `MISTRAL_API_KEY` verfügbar und `AI_PROVIDER=mistral` getestet
