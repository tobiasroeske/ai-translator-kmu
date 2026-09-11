// =============================================================================
// KI Translator KMU — Tone Validation (FA-08)
// =============================================================================
// Translates a fixed dataset at each tone against the live Mistral API and checks whether the
// output carries the register the tone instruction asked for. Writes a Markdown report, whose
// Method and Limitations sections state what the figures do and do not cover.
//
// Scored: the register markers lib/ai/tone-markers.ts can verify — the form of address and the
// salutation/closing — against both formal and informal source texts, so a tone cannot score well
// by carrying the source register over. Not scored: whether the text reads as formal beyond those
// markers, which is a human judgment, and `neutral`, whose instruction prescribes no form of
// address (it is compared against the `formal` output instead).
//
//   pnpm validate:tone                        # 2 runs per case against Mistral
//   pnpm validate:tone --runs=5               # 5 runs per case
//   pnpm validate:tone --provider=ollama      # same run against the local model
//   pnpm validate:tone --dry-run              # pipeline check with canned output, no API calls
// =============================================================================
import {
  applyProvider,
  formatPercent,
  loadLocalEnv,
  parseCommonArgs,
  registerAliasHook,
  reportPath,
  requireApiKey,
  sleep,
  writeReport,
} from './validation-shared.mjs';

registerAliasHook();
loadLocalEnv();

// Every source text addresses the reader directly. A text that addresses nobody cannot carry a
// form of address in any translation, so it would leave nothing to measure.
//
// Both source registers are represented, and the report scores each tone against both. With only
// formal sources, a model that ignored the tone instruction and carried the source register over
// would still score close to 100% on `formal` — the figure would say nothing about whether the
// instruction did any work. Each register is paired with a same-content counterpart (de-1/de-3,
// en-1/en-3) so the two differ in register and not in subject matter.
const DATASET = [
  {
    id: 'de-1',
    sourceLanguage: 'de',
    sourceRegister: 'formal',
    targets: ['en', 'fr', 'es'],
    text: 'Sehr geehrte Frau Berger, können Sie uns bitte bis Freitag bestätigen, ob Sie die geänderten Zeichnungen erhalten haben? Bei Rückfragen erreichen Sie mich jederzeit unter der bekannten Nummer.',
  },
  {
    id: 'de-2',
    sourceLanguage: 'de',
    sourceRegister: 'formal',
    targets: ['en', 'fr', 'es'],
    text: 'Vielen Dank für Ihre Anfrage. Bitte teilen Sie uns mit, welche Stückzahl Sie benötigen, damit wir Ihnen ein passendes Angebot zusenden können.',
  },
  {
    id: 'de-3',
    sourceLanguage: 'de',
    sourceRegister: 'informal',
    targets: ['en', 'fr', 'es'],
    text: 'Hallo Anna, kannst du mir bis Freitag kurz sagen, ob du die geänderten Zeichnungen bekommen hast? Wenn dir etwas unklar ist, ruf mich einfach an.',
  },
  {
    id: 'en-1',
    sourceLanguage: 'en',
    sourceRegister: 'formal',
    targets: ['de'],
    text: 'Dear Ms Berger, could you please confirm by Friday whether you have received the revised drawings? If you have any questions, you can reach me at the usual number.',
  },
  {
    id: 'en-2',
    sourceLanguage: 'en',
    sourceRegister: 'formal',
    targets: ['de'],
    text: 'Thank you for your enquiry. Please let us know what quantity you require so that we can send you a suitable quotation.',
  },
  {
    id: 'en-3',
    sourceLanguage: 'en',
    sourceRegister: 'informal',
    targets: ['de'],
    text: "Hi Anna, can you let me know by Friday whether you got the revised drawings? Just give me a call if anything's unclear.",
  },
];

const TONES = ['formal', 'informal', 'neutral'];

// What each tone's instruction claims about the form of address; `neutral` makes no such claim.
const EXPECTED_REGISTER = { formal: 'formal', informal: 'informal', neutral: null };

const buildTranslator = async () => {
  const { generateText, Output } = await import('ai');
  const { buildTranslateSystemPrompt, buildTranslateUserPrompt } = await import('@/lib/ai/prompts');
  const { getModel, MODEL_TEMPERATURE } = await import('@/lib/ai/provider');
  const { translationOutputSchema } = await import('@/lib/ai/schema');
  const { outputTokenBudget } = await import('@/lib/ai/limits');

  // The app's own prompt builders and schema, so this measures the prompt that serves requests.
  // generateText rather than streamText: there is nothing to stream to here, and it changes only
  // how the text is delivered, not how it is sampled.
  const translate = async ({ text, sourceLanguage, targetLanguage, tone }) => {
    const { output } = await generateText({
      model: getModel(),
      output: Output.object({ schema: translationOutputSchema }),
      temperature: MODEL_TEMPERATURE,
      maxOutputTokens: outputTokenBudget(text.length),
      system: buildTranslateSystemPrompt(tone),
      prompt: buildTranslateUserPrompt({
        sourceText: text,
        detectedSourceLanguage: sourceLanguage,
        targetLanguage,
      }),
    });
    return output.translatedText;
  };

  return { translate, modelVersion: getModel().modelId, temperature: MODEL_TEMPERATURE };
};

// Canned output for --dry-run, so aggregation and report generation can be checked without
// spending on API calls. The French informal case mixes vouvoiement and tutoiement to exercise
// the `mixed` path, and the neutral cases repeat the formal text to exercise the identical-output
// check.
const DRY_RUN_OUTPUT = {
  en: {
    formal: 'Dear Ms Berger, could you please confirm whether you have received the drawings?',
    informal: "Hi Anna, could you let me know if you've got the drawings?",
    neutral: 'Dear Ms Berger, could you please confirm whether you have received the drawings?',
  },
  fr: {
    formal: 'Madame, pourriez-vous nous confirmer votre réception des plans ?',
    informal: 'Merci pour votre demande. Dis-nous combien tu en as besoin.',
    neutral: 'Pourriez-vous nous confirmer votre réception des plans ?',
  },
  es: {
    formal: '¿Podría usted confirmarnos su recepción de los planos?',
    informal: '¿Puedes confirmarnos tú la recepción de tus planos?',
    neutral: '¿Podría usted confirmarnos su recepción de los planos?',
  },
  de: {
    formal:
      'Sehr geehrte Frau Berger, können Sie uns bitte bestätigen, ob Ihnen die Zeichnungen vorliegen?',
    informal: 'Hallo Anna, kannst du mir bitte bestätigen, ob dir die Zeichnungen vorliegen?',
    neutral: 'Können Sie uns bitte bestätigen, ob Ihnen die Zeichnungen vorliegen?',
  },
};

const buildFakeTranslator = () => ({
  translate: async ({ targetLanguage, tone }) => {
    await sleep(5);
    return DRY_RUN_OUTPUT[targetLanguage][tone];
  },
  modelVersion: 'canned output (--dry-run)',
  temperature: 0.2,
});

const runDataset = async ({ translate, classifyRegister, runs, delayMs }) => {
  const results = [];

  for (let runIndex = 1; runIndex <= runs; runIndex += 1) {
    for (const item of DATASET) {
      for (const targetLanguage of item.targets) {
        for (const tone of TONES) {
          const timestamp = new Date().toISOString();
          let translatedText = null;
          let analysis = null;
          let errorMessage = null;

          try {
            translatedText = await translate({
              text: item.text,
              sourceLanguage: item.sourceLanguage,
              targetLanguage,
              tone,
            });
            analysis = classifyRegister(translatedText, targetLanguage);
          } catch (error) {
            errorMessage = error instanceof Error ? error.message : String(error);
          }

          results.push({
            runIndex,
            timestamp,
            id: item.id,
            sourceRegister: item.sourceRegister,
            targetLanguage,
            tone,
            expected: EXPECTED_REGISTER[tone],
            register: analysis?.register ?? null,
            formalMatches: analysis?.formalMatches ?? [],
            informalMatches: analysis?.informalMatches ?? [],
            translatedText,
            error: errorMessage,
          });

          if (delayMs > 0) await sleep(delayMs);
        }
      }
    }
  }

  return results;
};

const emptyCounts = () => ({ formal: 0, informal: 0, mixed: 0, ambiguous: 0, error: 0 });

// The three ways of missing the expected register are counted apart, because they are different
// failures: the opposite register is the model ignoring the instruction, `mixed` is it applying
// the instruction to part of the text only, and `ambiguous` is the classifier finding no marker
// to read — not necessarily a fault of the translation at all.
const summariseTone = (results, tone) => {
  const forTone = results.filter((r) => r.tone === tone);
  const expected = EXPECTED_REGISTER[tone];

  const counts = emptyCounts();
  for (const r of forTone) {
    if (r.error) counts.error += 1;
    else counts[r.register] += 1;
  }

  return {
    tone,
    expected,
    total: forTone.length,
    counts,
    hits: expected ? counts[expected] : null,
    adherence: expected && forTone.length > 0 ? counts[expected] / forTone.length : null,
    deviations: expected ? forTone.filter((r) => r.register !== expected) : [],
  };
};

const summariseByLanguage = (results) => {
  const byLanguage = new Map();
  for (const r of results) {
    const key = `${r.targetLanguage}|${r.tone}`;
    const bucket = byLanguage.get(key) ?? { total: 0, ...emptyCounts() };
    bucket.total += 1;
    if (!r.error) bucket[r.register] += 1;
    byLanguage.set(key, bucket);
  }
  return byLanguage;
};

// The point of the split: a tone scored only against sources already written in that register
// cannot distinguish an instruction that works from a model copying the source.
const summariseBySourceRegister = (results) => {
  const bySource = new Map();
  for (const r of results) {
    if (EXPECTED_REGISTER[r.tone] === null) continue;
    const key = `${r.tone}|${r.sourceRegister}`;
    const bucket = bySource.get(key) ?? { total: 0, hits: 0 };
    bucket.total += 1;
    if (!r.error && r.register === r.expected) bucket.hits += 1;
    bySource.set(key, bucket);
  }
  return bySource;
};

// `neutral` prescribes no form of address, so it cannot be scored — but if its output is the same
// string as `formal` for the same case, the tone parameter did nothing for it, and that is
// checkable without any judgment about register.
const compareNeutralToFormal = (results) => {
  const formalByCase = new Map(
    results
      .filter((r) => r.tone === 'formal' && r.translatedText !== null)
      .map((r) => [`${r.runIndex}|${r.id}|${r.targetLanguage}`, r.translatedText])
  );

  let compared = 0;
  let identical = 0;
  for (const r of results) {
    if (r.tone !== 'neutral' || r.translatedText === null) continue;
    const formalText = formalByCase.get(`${r.runIndex}|${r.id}|${r.targetLanguage}`);
    if (formalText === undefined) continue;
    compared += 1;
    if (formalText === r.translatedText) identical += 1;
  }

  return { compared, identical };
};

const truncate = (text, length = 90) =>
  text === null ? '—' : text.length <= length ? text : `${text.slice(0, length)}…`;

const formatMarkers = (r) => {
  const parts = [];
  if (r.formalMatches.length > 0) parts.push(`formal: ${r.formalMatches.join(', ')}`);
  if (r.informalMatches.length > 0) parts.push(`informal: ${r.informalMatches.join(', ')}`);
  return parts.length === 0 ? '—' : truncate(parts.join(' · '), 60);
};

const buildReport = ({
  meta,
  results,
  toneSummaries,
  byLanguage,
  bySourceRegister,
  neutralVsFormal,
}) => {
  const languageRows = [...byLanguage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, b]) => {
      const [language, tone] = key.split('|');
      return `| ${language} | ${tone} | ${b.formal} | ${b.informal} | ${b.mixed} | ${b.ambiguous} | ${b.total} |`;
    })
    .join('\n');

  const sourceRegisterRows = [...bySourceRegister.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, b]) => {
      const [tone, sourceRegister] = key.split('|');
      const adherence = b.total > 0 ? b.hits / b.total : null;
      return `| ${tone} | ${sourceRegister} | ${b.hits}/${b.total} | ${formatPercent(adherence)} |`;
    })
    .join('\n');

  const scored = toneSummaries.filter((s) => s.expected !== null);
  const neutral = toneSummaries.find((s) => s.tone === 'neutral');

  const scoredRows = scored
    .map(
      (s) =>
        `| ${s.tone} | ${s.expected} | ${s.hits}/${s.total} | ${formatPercent(s.adherence)} | ` +
        `${s.counts[s.expected === 'formal' ? 'informal' : 'formal']} | ${s.counts.mixed} | ${s.counts.ambiguous} |`
    )
    .join('\n');

  const deviations = scored.flatMap((s) => s.deviations);
  const deviationRows =
    deviations.length === 0
      ? '_None._'
      : deviations
          .map(
            (r) =>
              `| ${r.runIndex} | ${r.id} → ${r.targetLanguage} | ${r.tone} | ${r.expected} | ` +
              `${r.register ?? `error: ${r.error}`} | ${formatMarkers(r)} | ${truncate(r.translatedText)} |`
          )
          .join('\n');

  return `# Tone Validation Report (FA-08)

Generated by \`pnpm validate:tone\` (\`scripts/validate-tone.mjs\`). Not a CI gate — the model's
register adherence is non-deterministic and has no fixed value to assert against. Re-run to
refresh this file.

## Run metadata

| Field | Value |
| --- | --- |
| Date | ${meta.date} |
| Provider | \`AI_PROVIDER=${meta.provider}\` |
| Model | ${meta.modelVersion} |
| Temperature | ${meta.temperature} |
| Runs per case | ${meta.runs} |
| Cases | ${DATASET.length} source texts, ${meta.casesPerRun} text/target/tone combinations |
| Total calls | ${results.length} |

## Method

Each source text is translated at each tone, and the output is classified by the register markers
it carries (\`lib/ai/tone-markers.ts\`, itself covered by \`lib/ai/tone-markers.test.ts\`). Two kinds
of marker count as evidence: the form of address (the pronouns, plus the second-person verb forms
in Spanish, which drops the pronoun in most business prose) and the salutation/closing, which is
the one register signal English has as well.

Nothing is read out of an absence, so a result falls into one of four buckets:

- **formal / informal** — only that register's markers were present.
- **mixed** — markers of both registers in one text. The tone instruction asks for one register
  across the whole text, so this is a distinct failure: the instruction reached part of the output
  only.
- **ambiguous** — no marker either way. Not counted as a failure: a short paragraph can legitimately
  carry no salutation and address nobody directly.

\`neutral\` has no expected register — its instruction prescribes "moderate formality" without
naming a form of address — so it is described below, not scored.

The dataset carries both formal and informal source texts, and the scores are broken down by
source register below. Scored against formal sources only, a model that ignored the tone
instruction and carried the source register over would still score close to 100% on \`formal\`.

## Scored tones

| Tone | Expected | Hits | Adherence | Opposite register | Mixed | Ambiguous |
| --- | --- | --- | --- | --- | --- | --- |
${scoredRows}

## By source register

Whether a tone holds up when the source text is written in the other register:

| Tone | Source register | Hits | Adherence |
| --- | --- | --- | --- |
${sourceRegisterRows}

## Neutral (descriptive)

What the model chose when the tone instruction left the form of address open:

| Formal | Informal | Mixed | Ambiguous | Total |
| --- | --- | --- | --- | --- |
| ${neutral.counts.formal} | ${neutral.counts.informal} | ${neutral.counts.mixed} | ${neutral.counts.ambiguous} | ${neutral.total} |

Identical to the \`formal\` output for the same case: **${neutralVsFormal.identical}/${neutralVsFormal.compared}**.
A high count here would mean the tone parameter changes nothing for \`neutral\`.

## By target language

| Language | Tone | Formal | Informal | Mixed | Ambiguous | Calls |
| --- | --- | --- | --- | --- | --- | --- |
${languageRows}

## Deviations

| Run | Case | Tone | Expected | Actual | Markers | Output (truncated) |
| --- | --- | --- | --- | --- | --- | --- |
${deviationRows}

## Limitations

- The classifier measures **grammatical and formulaic markers**, not overall register quality: a
  text using "Sie" and a formal salutation throughout while sounding brusque still scores as formal.
- French \`vous\` is both the polite singular and the plain plural, so a message addressed to a
  company can read as formal here regardless of the tone requested.
- Spanish \`usted\` is detected by pronoun and salutation only. Its verb forms are homographs of the
  third person (\`ha\`, \`tiene\`, \`podría\`), so unlike the \`tú\` forms they cannot be read as an
  address; a pronoun-less usted text without a salutation therefore lands in \`ambiguous\`.
- English has no T–V distinction. Its markers are contractions and the salutation/closing, so a
  short English text with neither is \`ambiguous\` rather than assigned a register.
- Sample sizes are small by design (this is a demonstrator, not a benchmark); raise \`--runs\` for
  a tighter figure. At the default of ${meta.runs} runs a single case is worth
  ${formatPercent(1 / (results.length / TONES.length))} of a tone's adherence, so small differences
  between runs are noise.
`;
};

const main = async () => {
  const { runs, delayMs, dryRun, provider } = parseCommonArgs(process.argv.slice(2), {
    defaultRuns: 2,
  });
  applyProvider(provider);
  requireApiKey(provider, dryRun);

  const REPORT_PATH = reportPath('tone', { dryRun });

  const { classifyRegister } = await import('@/lib/ai/tone-markers');

  const casesPerRun = DATASET.reduce((sum, item) => sum + item.targets.length, 0) * TONES.length;
  console.log(
    `Validating tone: ${casesPerRun} case(s) × ${runs} run(s)` +
      (dryRun ? ' [dry run — no API calls]' : ` against ${provider}`) +
      '.'
  );

  const { translate, modelVersion, temperature } = dryRun
    ? buildFakeTranslator()
    : await buildTranslator();

  const results = await runDataset({ translate, classifyRegister, runs, delayMs });
  const toneSummaries = TONES.map((tone) => summariseTone(results, tone));

  const report = buildReport({
    meta: {
      date: new Date().toISOString(),
      provider,
      modelVersion,
      temperature,
      runs,
      casesPerRun,
    },
    results,
    toneSummaries,
    byLanguage: summariseByLanguage(results),
    bySourceRegister: summariseBySourceRegister(results),
    neutralVsFormal: compareNeutralToFormal(results),
  });

  writeReport(REPORT_PATH, report);

  for (const summary of toneSummaries) {
    if (summary.expected === null) {
      const { formal, informal, mixed, ambiguous } = summary.counts;
      console.log(
        `  neutral (descriptive): ${formal} formal, ${informal} informal, ${mixed} mixed, ` +
          `${ambiguous} ambiguous`
      );
      continue;
    }
    console.log(
      `  ${summary.tone}: ${summary.hits}/${summary.total} (${formatPercent(summary.adherence)}) ` +
        `carried the ${summary.expected} register ` +
        `(${summary.counts.mixed} mixed, ${summary.counts.ambiguous} ambiguous)`
    );
  }

  console.log(`\nReport written to ${REPORT_PATH}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
