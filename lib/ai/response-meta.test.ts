import { describe, expect, it } from 'vitest';

import { parseTranslationMeta } from '@/lib/ai/response-meta';

describe('parseTranslationMeta', () => {
  it('reads the translation id and detected language off the response headers', () => {
    const headers = new Headers({
      'X-Translation-Id': '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      'X-Detected-Source-Language': 'de',
    });

    expect(parseTranslationMeta(headers)).toEqual({
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      detectedSourceLanguage: 'de',
    });
  });

  it('returns null fields when the headers are missing', () => {
    expect(parseTranslationMeta(new Headers())).toEqual({
      id: null,
      detectedSourceLanguage: null,
    });
  });

  // The route only streams for a catalog language, but the header is still just a string until
  // this function narrows it — a value outside the FA-06 catalog must not reach the client typed
  // as a LanguageCode.
  it('treats a source language outside the catalog as unknown rather than trusting the header', () => {
    const headers = new Headers({
      'X-Translation-Id': '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      'X-Detected-Source-Language': 'it',
    });

    expect(parseTranslationMeta(headers).detectedSourceLanguage).toBeNull();
  });
});
