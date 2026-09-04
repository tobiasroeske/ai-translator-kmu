import { createMistral } from '@ai-sdk/mistral';
import { createOllama } from 'ai-sdk-ollama';

const DEFAULT_MODEL = 'qwen2.5:7b' as const;
// Exported so the validation scripts can report which model version they measured against without
// hardcoding a second copy of the name.
export const DEFAULT_MISTRAL_MODEL = 'mistral-small-latest' as const;

// Translation and language detection each have one right answer, not many, so sampling stays low.
// Shared rather than repeated per call site: the validation scripts report the temperature they
// measured at, and that figure is only meaningful if it is the same one the routes run with.
export const MODEL_TEMPERATURE = 0.2;

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
