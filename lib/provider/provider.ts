import { createOllama } from 'ai-sdk-ollama';

const defaultModel = 'qwen2.5:7b';

// baseURL gehört auf die Provider-Factory (createOllama), nicht auf den
// Model-Aufruf ollama(model, settings) — dort gibt es keine URL-Option.
// Maps intern auf Config.host des ollama-js Clients.
export const getModel = () => {
  const provider = process.env.AI_PROVIDER ?? 'ollama';

  if (provider === 'ollama') {
    const ollama = createOllama({
      baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    });
    return ollama(defaultModel);
  }

  // Bewusst ein lauter Fehler statt Fake-Stub: @ai-sdk/anthropic ist noch
  // nicht installiert. Wird in Phase 3 (prod) verkabelt.
  if (provider === 'anthropic') {
    throw new Error('Anthropic provider not implemented yet — set AI_PROVIDER=ollama');
  }

  throw new Error(`Unknown AI_PROVIDER: "${provider}" — expected 'ollama' or 'anthropic'`);
};
