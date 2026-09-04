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

export const buildRetranslateUserPrompt = ({
  currentTranslation,
  segmentText,
  sourceLanguage,
  comment,
  targetLanguage,
}: {
  currentTranslation: string;
  segmentText: string;
  sourceLanguage: LanguageCode | null;
  comment: string;
  targetLanguage: LanguageCode;
}) => {
  // A comment is the whole point of this endpoint, but the "re-translate without a hint" case
  // (user just wants a different phrasing) is still worth supporting — an empty Comment section
  // in the prompt would otherwise read as a dangling label with nothing after it.
  const commentInstruction = comment ? comment : 'Improve the phrasing using your best judgment.';

  // Only shown when the original paragraph could be identified. Omitted rather than guessed: an
  // unrelated Source paragraph would pull the revision away from the text being revised.
  const sourceSection = segmentText
    ? `Source${sourceLanguage ? ` (${promptLanguageNames[sourceLanguage]})` : ''}:\n${segmentText}\n\n`
    : '';

  return (
    sourceSection +
    `Current translation (${promptLanguageNames[targetLanguage]}):\n${currentTranslation}\n\n` +
    `Comment:\n${commentInstruction}\n\n` +
    `Revise the translation into ${promptLanguageNames[targetLanguage]}.`
  );
};
