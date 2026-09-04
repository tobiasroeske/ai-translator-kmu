// =============================================================================
// KI Translator KMU — Tone Validation (FA-08)
// =============================================================================
// Translates a fixed dataset at each tone against the live Mistral API and checks whether the
// output actually carries the register the tone instruction asked for. Writes a Markdown report.
//
// What this can and cannot measure — the reason it is shaped this way:
//
//   Checkable:     lib/ai/tone.ts makes one falsifiable claim per tone — the form of address
//                  ("Sie" / "vous" / "usted" vs "du" / "tu" / "tú"), and for English, which has no
//                  T–V distinction, the absence of contractions. lib/ai/tone-markers.ts reads that
//                  off the output, and its own correctness is covered by Vitest.
//   Not checkable: whether the text *reads* as formal beyond the form of address — word choice,
//                  idiom, how a greeting lands with a business partner. That is a human judgment,
//                  and an LLM-as-judge would only answer a non-deterministic question with another
//                  non-deterministic one. This script does not pretend to measure it.
//   No expectation for `neutral`: its instruction deliberately does not prescribe a form of
//                  address, so the report describes what the model chose rather than scoring it.
//
// Separate from the detection script because it measures a different requirement, costs far more
// per run (full translations, not one-word answers) and produces its own report.
//
//   pnpm validate:tone                  # 2 runs per case (default)
//   pnpm validate:tone --runs=5         # 5 runs per case
//   pnpm validate:tone --dry-run        # pipeline check with canned output, no API calls
// =============================================================================
import {
  forceMistralProvider,
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
forceMistralProvider();

const REPORT_PATH = reportPath('tone-validation-report.md');

// Every source text addresses the reader directly. A text that addresses nobody ("Die Lieferung
// erfolgt am Montag") cannot carry a form of address in any translation, so it would produce
// nothing to measure no matter how well the tone instruction worked.
const DATASET = [
  {
    id: 'de-1',
    sourceLanguage: 'de',
    targets: ['en', 'fr', 'es'],
    text: 'Sehr geehrte Frau Berger, können Sie uns bitte bis Freitag bestätigen, ob Sie die geänderten Zeichnungen erhalten haben? Bei Rückfragen erreichen Sie mich jederzeit unter der bekannten Nummer.',
  },
  {
    id: 'de-2',
    sourceLanguage: 'de',
    targets: ['en', 'fr', 'es'],
    text: 'Vielen Dank für Ihre Anfrage. Bitte teilen Sie uns mit, welche Stückzahl Sie benötigen, damit wir Ihnen ein passendes Angebot zusenden können.',
  },
  {
    id: 'en-1',
    sourceLanguage: 'en',
    targets: ['de'],
    text: 'Dear Ms Berger, could you please confirm by Friday whether you have received the revised drawings? If you have any questions, you can reach me at the usual number.',
  },
  {
    id: 'en-2',
    sourceLanguage: 'en',
    targets: ['de'],
    text: 'Thank you for your enquiry. Please let us know what quantity you require so that we can send you a suitable quotation.',
  },
];

const TONES = ['formal', 'informal', 'neutral'];

// What each tone's instruction claims about the form of address. `neutral` maps to null because
// its instruction makes no such claim — see the header.
const EXPECTED_REGISTER = { formal: 'formal', informal: 'informal', neutral: null };

const buildTranslator = async () => {
  const { generateText, Output } = await import('ai');
  const { buildTranslateSystemPrompt, buildTranslateUserPrompt } = await import('@/lib/ai/prompts');
  const { getModel, MODEL_TEMPERATURE, DEFAULT_MISTRAL_MODEL } = await import('@/lib/ai/provider');
  const { translationOutputSchema } = await import('@/lib/ai/schema');
  const { outputTokenBudget } = await import('@/lib/ai/limits');

  // The app's own prompt builders and schema, so this measures the prompt that actually serves
  // requests. generateText rather than streamText only changes how the text is delivered, not how
  // it is sampled — there is nothing to stream to here.
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

  return { translate, modelVersion: DEFAULT_MISTRAL_MODEL, temperature: MODEL_TEMPERATURE };
};

// Canned output for --dry-run, so the aggregation and report can be checked without spending on
// API calls. The French informal case deliberately returns a vouvoiement text: a dry run where
// everything passes would not prove the deviation path works.
const DRY_RUN_OUTPUT = {
  en: {
    formal: 'Dear Ms Berger, could you please confirm whether you have received the drawings?',
    informal: "Hi Anna, could you let me know if you've got the drawings?",
    neutral: 'Dear Ms Berger, please confirm whether you have received the drawings.',
  },
  fr: {
    formal: 'Madame, pourriez-vous nous confirmer votre réception des plans ?',
    informal: 'Madame, pourriez-vous nous confirmer votre réception des plans ?',
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
          let register = null;
          let errorMessage = null;

          try {
            translatedText = await translate({
              text: item.text,
              sourceLanguage: item.sourceLanguage,
              targetLanguage,
              tone,
            });
            register = classifyRegister(translatedText, targetLanguage).register;
          } catch (error) {
            errorMessage = error instanceof Error ? error.message : String(error);
          }

          results.push({
            runIndex,
            timestamp,
            id: item.id,
            targetLanguage,
            tone,
            expected: EXPECTED_REGISTER[tone],
            register,
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

// Formal and informal are scored against their instruction's claim; neutral is only described.
// "opposite" is a real failure, "ambiguous" means the output carried no form of address at all —
// worth separating, because the two say different things about the prompt.
const summariseTone = (results, tone) => {
  const forTone = results.filter((r) => r.tone === tone);
  const expected = EXPECTED_REGISTER[tone];

  const counts = { formal: 0, informal: 0, ambiguous: 0, error: 0 };
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
    const bucket = byLanguage.get(key) ?? { total: 0, formal: 0, informal: 0, ambiguous: 0 };
    bucket.total += 1;
    if (!r.error) bucket[r.register] += 1;
    byLanguage.set(key, bucket);
  }
  return byLanguage;
};

const truncate = (text, length = 90) =>
  text === null ? '—' : text.length <= length ? text : `${text.slice(0, length)}…`;

const buildReport = ({ meta, results, toneSummaries, byLanguage }) => {
  const languageRows = [...byLanguage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, b]) => {
      const [language, tone] = key.split('|');
      return `| ${language} | ${tone} | ${b.formal} | ${b.informal} | ${b.ambiguous} | ${b.total} |`;
    })
    .join('\n');

  const scored = toneSummaries.filter((s) => s.expected !== null);
  const neutral = toneSummaries.find((s) => s.tone === 'neutral');

  const scoredRows = scored
    .map(
      (s) =>
        `| ${s.tone} | ${s.expected} | ${s.hits}/${s.total} | ${formatPercent(s.adherence)} | ` +
        `${s.counts[s.expected === 'formal' ? 'informal' : 'formal']} | ${s.counts.ambiguous} |`
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
              `${r.register ?? `error: ${r.error}`} | ${truncate(r.translatedText)} |`
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
| Provider | Mistral (\`AI_PROVIDER=mistral\`) |
| Model | ${meta.modelVersion} |
| Temperature | ${meta.temperature} |
| Runs per case | ${meta.runs} |
| Cases | ${DATASET.length} source texts, ${meta.casesPerRun} text/target/tone combinations |
| Total calls | ${results.length} |

## Method

Each source text is translated at each tone, and the output is classified by form of address
(\`lib/ai/tone-markers.ts\`, itself covered by \`lib/ai/tone-markers.test.ts\`):

- **de / fr / es** — polite address (Sie, vous, usted) vs familiar address (du, tu, tú).
- **en** — no T–V distinction, so the checkable claim is the tone instruction's contraction ban:
  contractions present → informal, absent → formal.
- **ambiguous** — the output carried no form of address either way. Counted separately rather than
  as a failure: a short paragraph can legitimately avoid addressing the reader.

\`neutral\` has no expected register — its instruction prescribes "moderate formality" without
naming a form of address — so it is described below, not scored.

## Scored tones

| Tone | Expected | Hits | Adherence | Opposite register | Ambiguous |
| --- | --- | --- | --- | --- | --- |
${scoredRows}

## Neutral (descriptive)

What the model chose when the tone instruction left the form of address open:

| Formal | Informal | Ambiguous | Total |
| --- | --- | --- | --- |
| ${neutral.counts.formal} | ${neutral.counts.informal} | ${neutral.counts.ambiguous} | ${neutral.total} |

## By target language

| Language | Tone | Formal | Informal | Ambiguous | Calls |
| --- | --- | --- | --- | --- | --- |
${languageRows}

## Deviations

| Run | Case | Tone | Expected | Actual | Output (truncated) |
| --- | --- | --- | --- | --- | --- |
${deviationRows}

## Limitations

- The classifier measures the **form of address only**, not overall register quality: a text using
  "Sie" throughout while sounding brusque still scores as formal.
- French \`vous\` is both the polite singular and the plain plural, so a message addressed to a
  company can read as formal here regardless of the tone requested.
- Spanish \`su\`/\`le\` double as third-person forms, which can register as formal markers without
  being address forms.
- English formality is inferred from the absence of contractions, which the tone instruction asks
  for explicitly but which is necessary rather than sufficient for a formal register.
- Sample sizes are small by design (this is a demonstrator, not a benchmark); raise \`--runs\` for
  a tighter figure.
`;
};

const main = async () => {
  const { runs, delayMs, dryRun } = parseCommonArgs(process.argv.slice(2), { defaultRuns: 2 });
  requireApiKey(dryRun);

  const { classifyRegister } = await import('@/lib/ai/tone-markers');

  const casesPerRun = DATASET.reduce((sum, item) => sum + item.targets.length, 0) * TONES.length;
  console.log(
    `Validating tone: ${casesPerRun} case(s) × ${runs} run(s)` +
      (dryRun ? ' [dry run — no API calls]' : ' against Mistral') +
      '.'
  );

  const { translate, modelVersion, temperature } = dryRun
    ? buildFakeTranslator()
    : await buildTranslator();

  const results = await runDataset({ translate, classifyRegister, runs, delayMs });
  const toneSummaries = TONES.map((tone) => summariseTone(results, tone));

  const report = buildReport({
    meta: { date: new Date().toISOString(), modelVersion, temperature, runs, casesPerRun },
    results,
    toneSummaries,
    byLanguage: summariseByLanguage(results),
  });

  writeReport(REPORT_PATH, report);

  for (const summary of toneSummaries) {
    if (summary.expected === null) {
      const { formal, informal, ambiguous } = summary.counts;
      console.log(
        `  neutral (descriptive): ${formal} formal, ${informal} informal, ${ambiguous} ambiguous`
      );
      continue;
    }
    console.log(
      `  ${summary.tone}: ${summary.hits}/${summary.total} (${formatPercent(summary.adherence)}) ` +
        `carried the ${summary.expected} form of address`
    );
  }

  console.log(`\nReport written to ${REPORT_PATH}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
