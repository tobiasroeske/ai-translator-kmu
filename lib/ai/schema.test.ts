import { describe, expect, it } from 'vitest';

import { translationOutputSchema } from '@/lib/ai/schema';

// The contract the streamed response is parsed against on both ends: the route generates against
// this schema, and useObject parses the incoming stream with it.
describe('translationOutputSchema', () => {
  it('accepts a finished translation', () => {
    const parsed = translationOutputSchema.safeParse({ translatedText: 'We confirm the date.' });
    expect(parsed.success).toBe(true);
  });

  // While the stream is open the client holds a partial object, which is why the UI reads
  // `object?.translatedText` rather than assuming a complete one.
  it('does not accept the partial states the stream passes through', () => {
    expect(translationOutputSchema.safeParse({}).success).toBe(false);
    expect(translationOutputSchema.safeParse({ translatedText: null }).success).toBe(false);
  });

  // The model is free to emit more than it was asked for; an extra field must not fail the parse
  // and take the whole translation with it.
  it('ignores a field the model added on its own', () => {
    const parsed = translationOutputSchema.safeParse({
      translatedText: 'We confirm the date.',
      detectedSourceLanguage: 'de',
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ translatedText: 'We confirm the date.' });
  });

  it('accepts an empty string, which the routes guard against themselves', () => {
    expect(translationOutputSchema.safeParse({ translatedText: '' }).success).toBe(true);
  });
});
