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
