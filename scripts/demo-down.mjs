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
// --purge deletes the local database and, if the containerised Ollama was used,
// its ~4.7 GB model volume. A natively installed Ollama is never touched — the
// setup script does not manage it and must not delete models it did not download.
// =============================================================================
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const DEMO_ENV_FILE = '.env.development.local';
const OLLAMA_VOLUME = 'ki-uebersetzer-kmu_ollama_models';

const isWindows = process.platform === 'win32';
const supabaseBin = join('node_modules', '.bin', isWindows ? 'supabase.cmd' : 'supabase');

const run = (command, args) => {
  const viaShell = isWindows && command.endsWith('.cmd');
  spawnSync(viaShell ? `"${command}"` : command, args, {
    stdio: 'inherit',
    shell: viaShell,
  });
};

// Scanned rather than read off argv[2]: `pnpm demo:down -- --purge` forwards the
// `--` itself as the first argument.
const purge = process.argv.slice(2).includes('--purge');

if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
  console.log('Docker läuft nicht — es gibt nichts zu stoppen.');
  process.exit(0);
}

// No-op when the native Ollama path was taken and this container never existed.
run('docker', ['compose', '--profile', 'ollama', 'down', '--remove-orphans']);

if (purge) {
  run(supabaseBin, ['stop', '--no-backup']);
  spawnSync('docker', ['volume', 'rm', '-f', OLLAMA_VOLUME], { stdio: 'ignore' });
  console.log('Datenvolumes entfernt.');
} else {
  run(supabaseBin, ['stop']);
}

rmSync(DEMO_ENV_FILE, { force: true });

console.log('Demo gestoppt.');
