// =============================================================================
// KI Translator KMU — Tone Validation (FA-08)
// =============================================================================
// Translates a fixed dataset at each tone against the live Mistral API and checks whether the
// output carries the register the tone instruction asked for. Writes a Markdown report, whose
// Method and Limitations sections state what the figures do and do not cover.
//
// Scored: the form of address (Sie / vous / usted), and for English the contraction ban — the one
// claim per tone that lib/ai/tone-markers.ts can verify. Not scored: whether the text reads as
// formal beyond that, which is a human judgment, and `neutral`, whose instruction prescribes no
// form of address.
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

const REPORT_PATH = reportPath('tone-validation-report.md');

// Every source text addresses the reader directly. A text that addresses nobody cannot carry a
// form of address in any translation, so it would leave nothing to measure.
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
// spending on API calls. The French informal case returns a vouvoiement text to exercise the
// deviation path.
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

// "opposite" and "ambiguous" are counted apart: a text in the wrong register is a failure, one
// with no form of address at all is not.
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
| Provider | \`AI_PROVIDER=${meta.provider}\` |
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
  const { runs, delayMs, dryRun, provider } = parseCommonArgs(process.argv.slice(2), {
    defaultRuns: 2,
  });
  applyProvider(provider);
  requireApiKey(provider, dryRun);

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
