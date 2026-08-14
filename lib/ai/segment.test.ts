import { describe, expect, it } from 'vitest';

import { joinSegments, replaceSegmentAt, segmentText } from '@/lib/ai/segment';

describe('segmentText', () => {
  it('splits on blank lines and trims each paragraph', () => {
    expect(segmentText('Erster Absatz.\n\n  Zweiter Absatz.  ')).toEqual([
      'Erster Absatz.',
      'Zweiter Absatz.',
    ]);
  });

  it('treats a blank line containing whitespace as a separator', () => {
    expect(segmentText('Eins.\n \t \nZwei.')).toEqual(['Eins.', 'Zwei.']);
  });

  it('keeps single line breaks inside a paragraph', () => {
    expect(segmentText('Sehr geehrte Damen und Herren,\nvielen Dank.')).toEqual([
      'Sehr geehrte Damen und Herren,\nvielen Dank.',
    ]);
  });

  it('drops empty paragraphs instead of emitting blanks', () => {
    expect(segmentText('\n\nEins.\n\n\n\nZwei.\n\n')).toEqual(['Eins.', 'Zwei.']);
  });
});

// The property the FA-07 round trip depends on: a stored translation is split, one paragraph is
// replaced, and the result is written back — repeatedly. If this ever stopped holding, indices
// would drift a little further with every re-translation.
describe('joinSegments / segmentText round trip', () => {
  it('is stable across repeated splitting and joining', () => {
    const once = joinSegments(segmentText('Eins.\n\n\nZwei.\n\nDrei.'));
    expect(joinSegments(segmentText(once))).toBe(once);
  });
});

describe('replaceSegmentAt', () => {
  const document = 'Eins.\n\nZwei.\n\nDrei.';

  it('replaces the addressed paragraph and leaves the others alone', () => {
    expect(replaceSegmentAt(document, 1, 'Two.')).toBe('Eins.\n\nTwo.\n\nDrei.');
  });

  it('replaces the first and last paragraph', () => {
    expect(replaceSegmentAt(document, 0, 'One.')).toBe('One.\n\nZwei.\n\nDrei.');
    expect(replaceSegmentAt(document, 2, 'Three.')).toBe('Eins.\n\nZwei.\n\nThree.');
  });

  it('returns null for an index the document does not have', () => {
    expect(replaceSegmentAt(document, 3, 'Vier.')).toBeNull();
    expect(replaceSegmentAt(document, -1, 'Null.')).toBeNull();
  });

  it('returns null for a non-integer index rather than silently rounding', () => {
    expect(replaceSegmentAt(document, 1.5, 'Zwei.')).toBeNull();
    expect(replaceSegmentAt(document, Number.NaN, 'Zwei.')).toBeNull();
  });

  it('normalises the separator of the paragraphs it keeps', () => {
    expect(replaceSegmentAt('Eins.\n\n\n\nZwei.', 0, 'One.')).toBe('One.\n\nZwei.');
  });
});
