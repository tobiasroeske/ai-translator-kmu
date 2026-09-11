// =============================================================================
// KI Translator KMU — Language Detection Validation (FA-02)
// =============================================================================
// Runs a fixed dataset N times through the app's own `detectLanguage()` against the live Mistral
// API and writes a Markdown report with the hit rate.
//
// Not a CI assertion: whether the model names a given language correctly is non-deterministic and
// has no fixed value to assert, so it produces a report rather than a pass/fail. The pure contract
// around it — fed a string, returns a lowercase ISO code — is covered by lib/ai/*.test.ts.
//
// Costs real API calls. Needs MISTRAL_API_KEY in .env.local or exported in the shell.
//
//   pnpm validate:language-detection                     # 3 runs per text against Mistral
//   pnpm validate:language-detection --runs=10           # 10 runs per text
//   pnpm validate:language-detection --provider=ollama   # same run against the local model
//   pnpm validate:language-detection --dry-run           # pipeline check, no API calls, no cost
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

// Short business-correspondence snippets, matching what FA-02 receives: emails and notes, not
// isolated words a model could match on vocabulary alone. Two languages outside the FA-06 catalog
// (it, pt) are included because this measures detectLanguage() naming what it sees, not the
// catalog membership decision that follows it in isSupportedLanguageCode().
const DATASET = [
  {
    id: 'de-1',
    language: 'de',
    text: 'Sehr geehrte Damen und Herren, anbei erhalten Sie die aktualisierte Auftragsbestätigung für die Lieferung im kommenden Quartal.',
  },
  {
    id: 'de-2',
    language: 'de',
    text: 'Wir bestätigen hiermit den vereinbarten Liefertermin und bitten um kurze Rückmeldung, falls sich am Zeitplan etwas ändert.',
  },
  {
    id: 'de-3',
    language: 'de',
    text: 'Bitte prüfen Sie die beigefügten Unterlagen und teilen Sie uns mit, ob aus Ihrer Sicht noch Anpassungen notwendig sind.',
  },
  {
    id: 'en-1',
    language: 'en',
    text: "Dear Sir or Madam, please find attached the updated order confirmation for next quarter's delivery schedule.",
  },
  {
    id: 'en-2',
    language: 'en',
    text: 'We would like to confirm the agreed delivery date and kindly ask you to let us know of any changes to the timeline.',
  },
  {
    id: 'en-3',
    language: 'en',
    text: 'Could you please review the attached documents and let us know whether any further adjustments are required?',
  },
  {
    id: 'fr-1',
    language: 'fr',
    text: 'Madame, Monsieur, veuillez trouver ci-joint la confirmation de commande actualisée pour la livraison du prochain trimestre.',
  },
  {
    id: 'fr-2',
    language: 'fr',
    text: 'Nous confirmons par la présente la date de livraison convenue et vous remercions de nous informer de tout changement.',
  },
  {
    id: 'fr-3',
    language: 'fr',
    text: 'Pourriez-vous vérifier les documents ci-joints et nous indiquer si des ajustements supplémentaires sont nécessaires ?',
  },
  {
    id: 'es-1',
    language: 'es',
    text: 'Estimados señores, adjunto encontrarán la confirmación de pedido actualizada para la entrega del próximo trimestre.',
  },
  {
    id: 'es-2',
    language: 'es',
    text: 'Por la presente confirmamos la fecha de entrega acordada y les rogamos nos informen de cualquier cambio en el calendario.',
  },
  {
    id: 'es-3',
    language: 'es',
    text: 'Les agradeceríamos que revisaran los documentos adjuntos y nos indicaran si son necesarios más ajustes.',
  },
  {
    id: 'it-1',
    language: 'it',
    text: "Gentili Signore e Signori, in allegato trovate la conferma d'ordine aggiornata per la consegna del prossimo trimestre.",
  },
  {
    id: 'it-2',
    language: 'it',
    text: 'Con la presente confermiamo la data di consegna concordata e vi preghiamo di comunicarci eventuali modifiche.',
  },
  {
    id: 'pt-1',
    language: 'pt',
    text: 'Caros Senhores, segue em anexo a confirmação de encomenda atualizada para a entrega do próximo trimestre.',
  },
  {
    id: 'pt-2',
    language: 'pt',
    text: 'Vimos por este meio confirmar a data de entrega acordada e agradecemos que nos informem de qualquer alteração.',
  },
];

// The app's own detection function, so the report describes the code path that serves requests.
const buildDetector = async () => {
  const { detectLanguage } = await import('@/lib/ai/detect-language');
  const { getModel, MODEL_TEMPERATURE } = await import('@/lib/ai/provider');

  return {
    detect: (text) => detectLanguage(text),
    modelVersion: getModel().modelId,
    temperature: MODEL_TEMPERATURE,
  };
};

// Used by --dry-run to exercise aggregation and report generation with no API calls. One text is
// reported wrong to exercise the mismatch path.
const buildFakeDetector = () => ({
  detect: async (text, item) => {
    await sleep(5);
    return item.id === 'it-2' ? 'es' : item.language;
  },
  modelVersion: 'fake detector (--dry-run)',
  temperature: 0.2,
});

const runDataset = async ({ detect, runs, delayMs }) => {
  const results = [];

  for (let runIndex = 1; runIndex <= runs; runIndex += 1) {
    for (const item of DATASET) {
      const timestamp = new Date().toISOString();
      let detected = null;
      let errorMessage = null;

      try {
        detected = await detect(item.text, item);
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      results.push({
        runIndex,
        timestamp,
        id: item.id,
        expected: item.language,
        detected,
        match: detected === item.language,
        error: errorMessage,
      });

      if (delayMs > 0) await sleep(delayMs);
    }
  }

  return results;
};

const summarise = (results) => {
  const byLanguage = new Map();
  for (const r of results) {
    const bucket = byLanguage.get(r.expected) ?? { total: 0, hits: 0 };
    bucket.total += 1;
    if (r.match) bucket.hits += 1;
    byLanguage.set(r.expected, bucket);
  }

  const hits = results.filter((r) => r.match).length;

  return {
    total: results.length,
    hits,
    accuracy: results.length === 0 ? 0 : hits / results.length,
    byLanguage,
    mismatches: results.filter((r) => !r.match),
  };
};

const buildReport = ({ meta, summary }) => {
  const languageRows = [...summary.byLanguage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([language, { total, hits }]) =>
        `| ${language} | ${hits}/${total} | ${formatPercent(total === 0 ? 0 : hits / total)} |`
    )
    .join('\n');

  const mismatchRows =
    summary.mismatches.length === 0
      ? '_None._'
      : summary.mismatches
          .map(
            (r) =>
              `| ${r.runIndex} | ${r.id} | ${r.expected} | ${r.detected ?? `error: ${r.error}`} | ${r.timestamp} |`
          )
          .join('\n');

  return `# Language Detection Validation Report (FA-02)

Generated by \`pnpm validate:language-detection\` (\`scripts/validate-language-detection.mjs\`).
Not a CI gate — see the header comment in that script for why. Re-run to refresh this file.

## Run metadata

| Field | Value |
| --- | --- |
| Date | ${meta.date} |
| Provider | \`AI_PROVIDER=${meta.provider}\` |
| Model | ${meta.modelVersion} |
| Temperature | ${meta.temperature} |
| Runs per text | ${meta.runs} |
| Dataset size | ${DATASET.length} texts across ${summary.byLanguage.size} languages |
| Total calls | ${summary.total} |

## Result

**${summary.hits}/${summary.total} correct (${formatPercent(summary.accuracy)})**

### By language

| Language | Hits | Accuracy |
| --- | --- | --- |
${languageRows}

### Mismatches

| Run | Text | Expected | Detected | Timestamp |
| --- | --- | --- | --- | --- |
${mismatchRows}

## Note on scope

This measures detection only. Whether a detected language is *offered* by the demonstrator is
decided by \`isSupportedLanguageCode()\`, not by the model — the \`it\` and \`pt\` texts above are
expected to be detected correctly and then rejected by that guard with a 422 (FA-02/FA-06).
`;
};

const main = async () => {
  const { runs, delayMs, dryRun, provider } = parseCommonArgs(process.argv.slice(2), {
    defaultRuns: 3,
  });
  applyProvider(provider);
  requireApiKey(provider, dryRun);

  const REPORT_PATH = reportPath('language-detection', { dryRun });

  console.log(
    `Validating language detection: ${DATASET.length} texts × ${runs} run(s)` +
      (dryRun ? ' [dry run — no API calls]' : ` against ${provider}`) +
      '.'
  );

  const { detect, modelVersion, temperature } = dryRun
    ? buildFakeDetector()
    : await buildDetector();

  const results = await runDataset({ detect, runs, delayMs });
  const summary = summarise(results);

  const report = buildReport({
    meta: { date: new Date().toISOString(), provider, modelVersion, temperature, runs },
    summary,
  });

  writeReport(REPORT_PATH, report);

  console.log(`\n${summary.hits}/${summary.total} correct (${formatPercent(summary.accuracy)})`);
  console.log(`Report written to ${REPORT_PATH}`);

  if (summary.mismatches.length > 0) {
    console.log('\nMismatches:');
    for (const m of summary.mismatches) {
      console.log(
        `  run ${m.runIndex} ${m.id}: expected ${m.expected}, got ${m.detected ?? m.error}`
      );
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
