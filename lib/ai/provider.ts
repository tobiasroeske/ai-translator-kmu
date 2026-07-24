import { createMistral } from '@ai-sdk/mistral';
import { createOllama } from 'ai-sdk-ollama';

const DEFAULT_MODEL = 'qwen2.5:7b' as const;
const DEFAULT_MISTRAL_MODEL = 'mistral-small-latest' as const;

// baseURL gehört auf die Provider-Factory (createOllama), nicht auf den
// Model-Aufruf ollama(model, settings) — dort gibt es keine URL-Option.
// Maps intern auf Config.host des ollama-js Clients.
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
