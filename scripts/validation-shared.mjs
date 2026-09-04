// =============================================================================
// Shared plumbing for the validation scripts (FA-02 detection, FA-08 tone).
// =============================================================================
// These scripts measure model behaviour, which has no fixed expected value to assert against, so
// they live outside `pnpm test` and produce a Markdown report instead of a pass/fail result.
// =============================================================================
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Lets a plain `node` run import the app's own modules by their `@/` specifier. Without this a
// script can only reimplement what it wants to measure, and a reimplementation drifts from the
// code that actually serves requests — which would make the reports measure the wrong thing.
// Node 24 strips the TypeScript types itself; only the alias needs resolving.
export const registerAliasHook = () => {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('@/')) {
        const base = join(ROOT, specifier.slice(2));
        for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
          if (existsSync(candidate)) {
            return { url: `file://${candidate}`, shortCircuit: true };
          }
        }
      }
      return nextResolve(specifier, context);
    },
  });
};

// Populates process.env from .env.local if it exists, so a local run needs no manual export. The
// file's contents are never read or logged by these scripts — Node loads it directly.
export const loadLocalEnv = () => {
  try {
    process.loadEnvFile(join(ROOT, '.env.local'));
  } catch {
    // No .env.local — the caller may already have the vars exported.
  }
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const formatPercent = (ratio) => `${(ratio * 100).toFixed(1)}%`;

export const parseCommonArgs = (argv, { defaultRuns }) => {
  const valueOf = (flag, fallback) => {
    const match = argv.find((arg) => arg.startsWith(`${flag}=`));
    return match ? Number.parseInt(match.split('=')[1], 10) : fallback;
  };

  return {
    runs: valueOf('--runs', defaultRuns),
    // A small gap between calls keeps a long run from tripping the provider's rate limit, which
    // would otherwise show up as failures that say nothing about the thing being measured.
    delayMs: valueOf('--delay-ms', 300),
    dryRun: argv.includes('--dry-run'),
  };
};

export const writeReport = (path, content) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};

export const reportPath = (filename) => join(ROOT, 'docs', filename);

// Both scripts force the provider rather than following .env.local: they exist to characterise the
// production model, not whatever a contributor points local dev at.
export const forceMistralProvider = () => {
  process.env.AI_PROVIDER = 'mistral';
};

export const requireApiKey = (dryRun) => {
  if (dryRun || process.env.MISTRAL_API_KEY) return;
  console.error(
    'MISTRAL_API_KEY is not set. Add it to .env.local, export it in the shell, or run with ' +
      '--dry-run to check the script itself without calling the API.'
  );
  process.exit(1);
};
