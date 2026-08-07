export const segmentText = (sourceText: string): string[] => {
  const regex = /\n\s*\n/;

  // Split the source text into segments based on paragraph breaks (double newlines)
  const segments = sourceText
    .split(regex)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  return segments;
};
