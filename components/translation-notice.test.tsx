// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import TranslationNotice from '@/components/translation-notice';
import { NOTICE_TEXT } from '@/lib/notice';

// FA-05 (EU AI Act Art. 50) requires the AI-generated label on the output itself. This covers the
// notice rendering; whether it is shown is the `hasTranslation` gate in translate-provider.tsx.
describe('TranslationNotice', () => {
  afterEach(cleanup);

  it('renders the FA-05 / FA-10 notice text', () => {
    render(<TranslationNotice />);
    expect(screen.getByText(NOTICE_TEXT)).toBeTruthy();
  });
});
