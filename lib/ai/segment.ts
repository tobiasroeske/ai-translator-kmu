// Paragraph separator used when reassembling segments into a document. Lives next to the split so
// the two halves of the same rule can't drift apart: joinSegments(segmentText(t)) is stable, which
// is what lets a stored translation be split, edited and written back repeatedly (FA-07).
const SEGMENT_SEPARATOR = '\n\n';

export const joinSegments = (segments: string[]): string => segments.join(SEGMENT_SEPARATOR);

export const segmentText = (sourceText: string): string[] => {
  const regex = /\n\s*\n/;

  // Split the source text into segments based on paragraph breaks (double newlines)
  const segments = sourceText
    .split(regex)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  return segments;
};

// The FA-07 update rule as a single expression: which paragraph of a stored document a
// re-translation replaces, and what the document reads as afterwards. Kept free of any database
// access so the rule can be exercised on plain strings; the caller decides what to do with `null`.
// Returns null when the index addresses a paragraph the document doesn't have — that is a stale
// or forged request, not an empty result.
export const replaceSegmentAt = (
  text: string,
  index: number,
  replacement: string
): string | null => {
  const segments = segmentText(text);

  if (!Number.isInteger(index) || index < 0 || index >= segments.length) return null;

  segments[index] = replacement;
  return joinSegments(segments);
};
