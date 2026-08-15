// Helpers shared by the demo scripts.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const isWindows = process.platform === 'win32';

export const supabaseBin = join('node_modules', '.bin', isWindows ? 'supabase.cmd' : 'supabase');

export const step = (message) => console.log(`\n\x1b[1;34m▶ ${message}\x1b[0m`);

export const run = (command, args, { capture = false, check = true } = {}) => {
  // Node refuses to spawn .cmd shims directly since CVE-2024-27980, so those need a
  // shell — and then quoting, because the repository path may contain spaces.
  const viaShell = isWindows && command.endsWith('.cmd');
  const result = spawnSync(viaShell ? `"${command}"` : command, args, {
    stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    shell: viaShell,
    encoding: 'utf8',
  });

  if (check && result.status !== 0) {
    throw new Error(`\`${command} ${args.join(' ')}\` schlug fehl (Exit ${result.status}).`);
  }
  return result.stdout ?? '';
};

export const requireDocker = () => {
  if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
    throw new Error('Docker läuft nicht. Bitte Docker Desktop starten und erneut versuchen.');
  }
};

export const fail = (error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
};
