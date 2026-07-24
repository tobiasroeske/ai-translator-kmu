export type Language = {
  code: string;
  label: string;
};

export const languages: Language[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'Englisch' },
  { code: 'fr', label: 'Französisch' },
  { code: 'es', label: 'Spanisch' },
] as const satisfies Language[];
