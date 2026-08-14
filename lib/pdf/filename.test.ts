import { describe, expect, it } from 'vitest';

import { createPdfFilename } from '@/lib/pdf/filename';

describe('createPdfFilename', () => {
  it('builds a name from the target language and the date', () => {
    expect(createPdfFilename('en', new Date('2026-08-14T10:00:00Z'))).toBe(
      'uebersetzung-en-2026-08-14.pdf'
    );
  });

  it('reflects a different target language', () => {
    expect(createPdfFilename('de', new Date('2026-08-14T10:00:00Z'))).toBe(
      'uebersetzung-de-2026-08-14.pdf'
    );
  });

  it('defaults to the current date when none is given', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(createPdfFilename('fr')).toBe(`uebersetzung-fr-${today}.pdf`);
  });
});
