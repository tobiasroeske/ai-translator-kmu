import { type LanguageCode } from '@/lib/ai/languages';

// The date defaults to "now" but stays a parameter so it can be pinned in tests — a filename that
// silently depends on the clock at call time can't be asserted against exactly.
export const createPdfFilename = (
  targetLanguage: LanguageCode,
  date: Date = new Date()
): string => {
  const isoDate = date.toISOString().slice(0, 10);
  return `uebersetzung-${targetLanguage}-${isoDate}.pdf`;
};
