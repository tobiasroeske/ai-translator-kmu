import { describe, expect, it } from 'vitest';

import { isSupportedLanguageCode, languageCodes, promptLanguageNames } from '@/lib/ai/languages';

// FA-02: catalog membership is decided here rather than by the model, so this guard is the thing
// that actually enforces which languages the demonstrator accepts.
describe('isSupportedLanguageCode', () => {
  it('accepts every code in the catalog', () => {
    for (const code of languageCodes) {
      expect(isSupportedLanguageCode(code)).toBe(true);
    }
  });

  it('rejects a real language that is not in the catalog', () => {
    expect(isSupportedLanguageCode('it')).toBe(false);
    expect(isSupportedLanguageCode('pl')).toBe(false);
  });

  it('rejects anything that is not a plain code', () => {
    expect(isSupportedLanguageCode('DE')).toBe(false);
    expect(isSupportedLanguageCode('de-AT')).toBe(false);
    expect(isSupportedLanguageCode('')).toBe(false);
    expect(isSupportedLanguageCode(undefined)).toBe(false);
    expect(isSupportedLanguageCode(null)).toBe(false);
  });
});

describe('promptLanguageNames', () => {
  it('names every catalog language, so no prompt can fall back to a bare code', () => {
    for (const code of languageCodes) {
      expect(promptLanguageNames[code]).toBeTruthy();
    }
  });
});
