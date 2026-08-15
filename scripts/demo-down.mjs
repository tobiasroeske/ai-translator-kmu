// =============================================================================
// KI Translator KMU — Demo Teardown
// =============================================================================
// Reverses scripts/demo-setup.mjs. Invoked by `pnpm demo:down`.
//
// By default the data volumes survive, so the next `pnpm demo` starts in seconds
// with the demo's translation history intact. Pass --purge to reclaim the disk:
//
//   pnpm demo:down -- --purge
//
// --purge deletes the local database and, when the containerised Ollama was used,
// its ~4.7 GB model volume. A natively installed Ollama is never touched.
// =============================================================================
import { rmSync } from 'node:fs';

import { fail, requireDocker, run, supabaseBin } from './shared.mjs';

const DEMO_ENV_FILE = '.env.development.local';
const OLLAMA_VOLUME = 'ki-uebersetzer-kmu_ollama_models';

// Scanned across all arguments: `pnpm demo:down -- --purge` forwards the `--`
// itself as argv[2].
const purge = process.argv.slice(2).includes('--purge');

const main = () => {
  requireDocker();

  // No-op when the native Ollama path was taken and this container never existed.
  run('docker', ['compose', '--profile', 'ollama', 'down', '--remove-orphans']);

  if (purge) {
    run(supabaseBin, ['stop', '--no-backup']);
    // check: false — the volume is absent whenever the container was never used.
    run('docker', ['volume', 'rm', '-f', OLLAMA_VOLUME], { check: false });
    console.log('Datenvolumes entfernt.');
  } else {
    run(supabaseBin, ['stop']);
  }

  rmSync(DEMO_ENV_FILE, { force: true });
  console.log('Demo gestoppt.');
};

try {
  main();
} catch (error) {
  fail(error);
}
