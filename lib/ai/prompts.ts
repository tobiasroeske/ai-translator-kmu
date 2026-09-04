import { type LanguageCode, promptLanguageNames } from '@/lib/ai/languages';
import { type Tone, toneInstructions } from '@/lib/ai/tone';

// The prompts both translation routes send. Pure functions so they can be covered without a
// running model (lib/ai/prompts.test.ts) and reused by the FA-08 validation script.

export const buildTranslateSystemPrompt = (tone: Tone) =>
  'You are a professional business translator.\n\n' +
  'Rules:\n' +
  `1. Tone: ${toneInstructions[tone]}\n` +
  '2. Translate the ENTIRE source text. Translate every paragraph, from the first line to the ' +
  'last, and keep the paragraph breaks of the source text. Never stop after the greeting or ' +
  'after only part of the text.\n\n' +
  'Output ONLY the translation itself — no explanations, no comments, no alternate ' +
  'translations, no additional languages, no meta-commentary of any kind.';

export const buildTranslateUserPrompt = ({
  sourceText,
  detectedSourceLanguage,
  targetLanguage,
}: {
  sourceText: string;
  detectedSourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}) =>
  `Translate the following ${promptLanguageNames[detectedSourceLanguage]} text to ` +
  `${promptLanguageNames[targetLanguage]}.\n\nText:\n${sourceText}`;

export const buildRetranslateSystemPrompt = (tone: Tone) =>
  'You are a professional business translator. You revise ONE paragraph of an existing ' +
  'translation according to a comment from the user.\n\n' +
  `Tone: ${toneInstructions[tone]}\n\n` +
  'Apply the comment to the paragraph and keep everything it does not mention as it is. ' +
  'Return the complete revised paragraph — every sentence, not only the part the comment ' +
  'refers to. Output the paragraph itself, nothing else: no explanations, no alternative ' +
  'versions, no meta-commentary.';

// The revision works from the current translation and the comment alone. The source paragraph is
// deliberately not an input: nothing can pair it with a translated paragraph reliably. The pairing
// is positional, and the model is free to merge or split paragraphs while translating, so the
// source it points at can belong to a different paragraph — and a mismatched source does not merely
// go unused, it pulls the model into re-translating that other paragraph instead of revising the
// text on screen. The current translation is by definition the text the user commented on, which
// makes it the one input that is always the right one.
export const buildRetranslateUserPrompt = ({
  currentTranslation,
  comment,
  targetLanguage,
}: {
  currentTranslation: string;
  comment: string;
  targetLanguage: LanguageCode;
}) => {
  // A comment is the whole point of this endpoint, but the "re-translate without a hint" case
  // (user just wants a different phrasing) is still worth supporting — an empty Comment section
  // in the prompt would otherwise read as a dangling label with nothing after it.
  const commentInstruction = comment ? comment : 'Improve the phrasing using your best judgment.';

  return (
    `Current translation (${promptLanguageNames[targetLanguage]}):\n${currentTranslation}\n\n` +
    `Comment:\n${commentInstruction}\n\n` +
    `Revise the translation into ${promptLanguageNames[targetLanguage]}.`
  );
};
