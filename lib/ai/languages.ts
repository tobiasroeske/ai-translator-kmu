import { createEnumGuard } from '@/lib/utils';

export const languageCodes = ['de', 'en', 'fr', 'es'] as const;

export type LanguageCode = (typeof languageCodes)[number];

export type Language = {
  code: LanguageCode;
  label: string;
};

export const languages: Language[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'Englisch' },
  { code: 'fr', label: 'Französisch' },
  { code: 'es', label: 'Spanisch' },
] as const satisfies Language[];

export const supportedLanguageLabels = languages.map(({ label }) => label).join(', ');

// Used inside the prompts, which are written in English. A bare ISO code asks the model to resolve
// "fr" to a language before it can act on it; the name states it outright.
export const promptLanguageNames: Record<LanguageCode, string> = {
  de: 'German',
  en: 'English',
  fr: 'French',
  es: 'Spanish',
} as const satisfies Record<LanguageCode, string>;

// FA-02: catalog membership is decided here, not by the model — a small model can name a
// language reliably but is not reliable at also deciding set membership (see CLAUDE.md).
export const isSupportedLanguageCode = createEnumGuard(languageCodes);

// Resolves a bare ISO 639-1 code to a German language name for display. `of()` throws on
// unknown/malformed codes; falling back to the raw code beats showing nothing.
export const toLanguageName = (code: string) => {
  try {
    return new Intl.DisplayNames(['de'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
};
