import { describe, expect, it } from 'vitest';

import {
  buildRetranslateSystemPrompt,
  buildRetranslateUserPrompt,
  buildTranslateSystemPrompt,
  buildTranslateUserPrompt,
} from '@/lib/ai/prompts';
import { toneInstructions } from '@/lib/ai/tone';

describe('buildTranslateSystemPrompt', () => {
  it('embeds the requested tone instruction', () => {
    expect(buildTranslateSystemPrompt('formal')).toContain(toneInstructions.formal);
    expect(buildTranslateSystemPrompt('informal')).toContain(toneInstructions.informal);
  });

  // The rule guards against a small model stopping after the first paragraph.
  it('instructs the model to translate the entire text', () => {
    expect(buildTranslateSystemPrompt('neutral')).toMatch(/ENTIRE source text/);
  });
});

describe('buildTranslateUserPrompt', () => {
  it('names both languages by their full English name, not the bare ISO code', () => {
    const prompt = buildTranslateUserPrompt({
      sourceText: 'Sehr geehrte Damen und Herren,',
      detectedSourceLanguage: 'de',
      targetLanguage: 'en',
    });

    expect(prompt).toContain('German');
    expect(prompt).toContain('English');
    expect(prompt).not.toContain(' de ');
  });

  it('carries the source text through unchanged', () => {
    const sourceText = 'Wir bestätigen den Liefertermin.';
    const prompt = buildTranslateUserPrompt({
      sourceText,
      detectedSourceLanguage: 'de',
      targetLanguage: 'fr',
    });

    expect(prompt).toContain(sourceText);
  });
});

describe('buildRetranslateSystemPrompt', () => {
  it('embeds the requested tone instruction', () => {
    expect(buildRetranslateSystemPrompt('formal')).toContain(toneInstructions.formal);
  });

  // FA-07 revises the existing paragraph instead of translating the source again.
  it('instructs the model to revise rather than retranslate from scratch', () => {
    expect(buildRetranslateSystemPrompt('neutral')).toMatch(/revise/i);
  });
});

describe('buildRetranslateUserPrompt', () => {
  const base = {
    currentTranslation: 'We confirm the delivery date.',
    comment: 'Keep "delivery date" as a fixed term.',
    targetLanguage: 'en' as const,
  };

  it('includes the current translation and the comment', () => {
    const prompt = buildRetranslateUserPrompt(base);

    expect(prompt).toContain(base.currentTranslation);
    expect(prompt).toContain(base.comment);
  });

  it('falls back to a generic instruction when the comment is empty', () => {
    const prompt = buildRetranslateUserPrompt({ ...base, comment: '' });
    expect(prompt).toContain('Improve the phrasing using your best judgment.');
  });

  // A source paragraph can only be paired with a translated one by position, and that pairing can
  // point at a different paragraph — put in front of the model, a mismatched one makes it
  // re-translate that other paragraph instead of revising the text the user commented on.
  it('never puts a source paragraph in front of the model', () => {
    expect(buildRetranslateUserPrompt(base)).not.toContain('Source');
  });
});
