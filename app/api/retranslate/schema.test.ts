import { describe, expect, it } from 'vitest';

import { retranslateRequestSchema } from '@/app/api/retranslate/schema';
import { MAX_COMMENT_LENGTH, MAX_SEGMENT_TEXT_LENGTH } from '@/lib/ai/limits';

const valid = {
  currentTranslation: 'We confirm the delivery date.',
  comment: 'Fachbegriff "Liefertermin" beibehalten.',
  targetLanguage: 'en',
  tone: 'formal',
  translationId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  segmentIndex: 0,
};

describe('retranslateRequestSchema', () => {
  it('accepts a well-formed request', () => {
    expect(retranslateRequestSchema.safeParse(valid).success).toBe(true);
  });

  // The paragraph being revised is the one thing the route cannot work without.
  it('requires the current translation', () => {
    expect(retranslateRequestSchema.safeParse({ ...valid, currentTranslation: '' }).success).toBe(
      false
    );
    expect(
      retranslateRequestSchema.safeParse({ ...valid, currentTranslation: undefined }).success
    ).toBe(false);
  });

  it('accepts a null translation id — the revision runs, it just is not persisted', () => {
    expect(retranslateRequestSchema.safeParse({ ...valid, translationId: null }).success).toBe(
      true
    );
  });

  it('accepts an empty comment — revising without a hint is a supported case', () => {
    expect(retranslateRequestSchema.safeParse({ ...valid, comment: '' }).success).toBe(true);
  });

  it('rejects a translation id that is not a uuid', () => {
    expect(retranslateRequestSchema.safeParse({ ...valid, translationId: 'abc' }).success).toBe(
      false
    );
  });

  // The UI limit only ever guarded the full-text route, so without a bound here a direct caller
  // could hand the model an arbitrarily large prompt through either field.
  it('bounds the current translation and the comment', () => {
    const overSegment = 'a'.repeat(MAX_SEGMENT_TEXT_LENGTH + 1);
    const overComment = 'a'.repeat(MAX_COMMENT_LENGTH + 1);

    expect(
      retranslateRequestSchema.safeParse({ ...valid, currentTranslation: overSegment }).success
    ).toBe(false);
    expect(retranslateRequestSchema.safeParse({ ...valid, comment: overComment }).success).toBe(
      false
    );
  });

  it('rejects a segment index that is negative or not a whole number', () => {
    expect(retranslateRequestSchema.safeParse({ ...valid, segmentIndex: -1 }).success).toBe(false);
    expect(retranslateRequestSchema.safeParse({ ...valid, segmentIndex: 1.5 }).success).toBe(false);
    expect(retranslateRequestSchema.safeParse({ ...valid, segmentIndex: '0' }).success).toBe(false);
  });
});
