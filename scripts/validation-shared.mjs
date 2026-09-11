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

// Lets a plain `node` run import the app's own modules by their `@/` specifier, so the scripts
// measure the code that serves requests rather than a copy of it. Node 24 strips the TypeScript
// types itself; only the alias needs resolving.
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

// Populates process.env from .env.local if it exists, so a local run needs no manual export.
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

  const provider = argv.find((arg) => arg.startsWith('--provider='));

  return {
    runs: valueOf('--runs', defaultRuns),
    // A gap between calls keeps a long run from tripping the provider's rate limit, which would
    // otherwise show up as failures that say nothing about what is being measured.
    delayMs: valueOf('--delay-ms', 300),
    dryRun: argv.includes('--dry-run'),
    provider: provider ? provider.split('=')[1] : 'mistral',
  };
};

export const writeReport = (path, content) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};

// Every measured run writes its own file instead of replacing the last one. These reports record
// how a named model behaved on a given day, and comparing a run against the one before it — after
// a prompt or dataset change — is what they are for; overwriting throws that away. A dry run is a
// pipeline check with canned output, so it keeps one fixed name and overwrites only itself,
// where it can never land on top of a measured result.
export const reportPath = (slug, { dryRun = false } = {}) => {
  if (dryRun) return join(ROOT, 'docs', 'validation', `${slug}-dry-run.md`);

  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return join(ROOT, 'docs', 'validation', `${slug}-${stamp}.md`);
};

// Set from the flag rather than followed from .env.local: the reports characterise a named
// provider, so the run decides which one instead of inheriting whatever local dev points at.
// Mistral is the default because it is what production uses; `--provider=ollama` runs the same
// datasets against the local model through the same abstraction.
export const applyProvider = (provider) => {
  if (provider !== 'mistral' && provider !== 'ollama') {
    console.error(`Unknown --provider="${provider}" — expected 'mistral' or 'ollama'.`);
    process.exit(1);
  }
  process.env.AI_PROVIDER = provider;
};

export const requireApiKey = (provider, dryRun) => {
  if (dryRun || provider !== 'mistral' || process.env.MISTRAL_API_KEY) return;
  console.error(
    'MISTRAL_API_KEY is not set. Add it to .env.local, export it in the shell, run with ' +
      '--provider=ollama, or run with --dry-run to check the script without calling an API.'
  );
  process.exit(1);
};
