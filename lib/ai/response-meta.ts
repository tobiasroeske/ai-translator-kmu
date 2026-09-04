import { isSupportedLanguageCode, type LanguageCode } from '@/lib/ai/languages';

// What /api/translate hands back outside the stream body: the history row it was saved as (FA-07
// needs this to update a single paragraph later) and the source language it was validated against.
export type TranslationMeta = {
  id: string | null;
  detectedSourceLanguage: LanguageCode | null;
};

export const parseTranslationMeta = (headers: Headers): TranslationMeta => {
  const detected = headers.get('X-Detected-Source-Language');
  return {
    id: headers.get('X-Translation-Id'),
    // Re-checked rather than trusted: the route only streams for a catalog language, but a header
    // is a string until something narrows it, and the value is passed on to /api/retranslate as a
    // typed field.
    detectedSourceLanguage: isSupportedLanguageCode(detected) ? detected : null,
  };
};
