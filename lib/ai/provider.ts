import { createMistral } from '@ai-sdk/mistral';
import { createOllama } from 'ai-sdk-ollama';

const DEFAULT_MODEL = 'qwen2.5:7b' as const;
// Exported so scripts/validate-language-detection.mjs can report which model version it measured
// against without hardcoding a second copy of the name.
export const DEFAULT_MISTRAL_MODEL = 'mistral-small-latest' as const;

// baseURL belongs on the provider factory (createOllama), not on the
// model call ollama(model, settings) — there is no URL option there.
// Maps internally to the ollama-js client's Config.host.
export const getModel = () => {
  const provider = process.env.AI_PROVIDER ?? 'ollama';

  if (provider === 'ollama') {
    const ollama = createOllama({
      baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    });
    return ollama(DEFAULT_MODEL);
  }

  if (provider === 'mistral') {
    const mistral = createMistral({
      apiKey: process.env.MISTRAL_API_KEY,
    });
    return mistral(DEFAULT_MISTRAL_MODEL);
  }

  throw new Error(`Unknown AI_PROVIDER: "${provider}" — expected 'ollama' or 'mistral'`);
};
