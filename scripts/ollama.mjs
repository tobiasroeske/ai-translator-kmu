// Provisioning the demo's language model.
//
// Ollama's HTTP API behaves the same whether a native install or the compose
// container is listening on the port, so the caller never has to know which one it
// reached. A model already present on the host is therefore never downloaded a
// second time into a container volume.
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

import { fail, requireDocker, run } from './shared.mjs';

export const MODEL = 'qwen2.5:7b';

const OLLAMA_URL = 'http://localhost:11434';
const CONTAINER = 'ki-translator-kmu-ollama';
// A download is bounded by lack of progress, not total duration: 4.7 GB takes
// minutes on a fast line and hours on a slow one.
const STALL_MS = 10 * 60_000;
const CONTAINER_READY_MS = 60_000;
const MIN_REPORTED_BYTES = 100e6;

const isReachable = async () => {
  try {
    return (await fetch(`${OLLAMA_URL}/api/tags`)).ok;
  } catch {
    return false;
  }
};

const startContainer = async () => {
  run('docker', ['compose', '--profile', 'ollama', 'up', '-d', 'ollama']);

  const deadline = Date.now() + CONTAINER_READY_MS;
  while (!(await isReachable())) {
    if (Date.now() > deadline) {
      throw new Error(
        `Der Ollama-Container antwortet nicht.\nLogs prüfen: docker logs ${CONTAINER}`
      );
    }
    await sleep(2000);
  }
};

// Streams Ollama's NDJSON pull progress. Returns immediately when the model is
// already present, so this is safe to call on every run.
const pullModel = async () => {
  const abort = new AbortController();
  let watchdog;
  const resetWatchdog = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => abort.abort(), STALL_MS);
  };

  resetWatchdog();
  try {
    const response = await fetch(`${OLLAMA_URL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL }),
      signal: abort.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama lehnte den Download von ${MODEL} ab (HTTP ${response.status}).`);
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let reported = '';

    for await (const chunk of response.body) {
      resetWatchdog();
      buffer += decoder.decode(chunk, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);

        if (event.error) throw new Error(event.error);
        // Only the weights are worth reporting; the manifest and config blobs are
        // a few kilobytes and would render as "0.0 / 0.0 GB".
        if (!event.total || event.total < MIN_REPORTED_BYTES) continue;

        // Reported only when the rounded value moves, to keep a slow download from
        // scrolling the terminal full of identical lines.
        const progress = `${((event.completed ?? 0) / 1e9).toFixed(1)} / ${(event.total / 1e9).toFixed(1)} GB`;
        if (progress !== reported) {
          console.log(`  … ${progress}`);
          reported = progress;
        }
      }
    }
  } catch (error) {
    if (abort.signal.aborted) {
      throw new Error(
        `Der Download von ${MODEL} hat sich ${STALL_MS / 60_000} Minuten nicht bewegt.\n` +
          `Logs prüfen: docker logs ${CONTAINER}`
      );
    }
    throw error;
  } finally {
    clearTimeout(watchdog);
  }
};

export const ensureOllamaModel = async () => {
  if (await isReachable()) {
    console.log('Ollama läuft bereits — Container wird nicht gestartet.');
  } else {
    console.log('Kein Ollama erreichbar — Container wird gestartet.');
    await startContainer();
  }

  await pullModel();
  console.log(`${MODEL} ist bereit.`);
};

// Runnable on its own (`node scripts/ollama.mjs`), which is how pnpm docker:up
// provisions the model before bringing the app container up.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  requireDocker();
  ensureOllamaModel().catch(fail);
}
