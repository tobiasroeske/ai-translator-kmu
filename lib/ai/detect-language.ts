import { generateText, Output } from 'ai';
import { z } from 'zod';

import { getModel } from '@/lib/ai/provider';

const detectionSchema = z.object({
  detectedSourceLanguage: z
    .string()
    .describe('ISO 639-1 code of the language the text is written in, e.g. "de", "en", "it"'),
});

// Identifying a language takes a few sentences, not the whole document. Since this runs as a
// separate call before the translation, passing the full text would make every request pay the
// prompt-evaluation cost of the source text twice — and on a local model that cost dominates the
// time before the first translated word appears.
// Enough for a salutation plus the first sentence or two, which is well past what identifying a
// language reliably needs.
const DETECTION_SAMPLE_LENGTH = 200;

// A separate, minimal-output call so an unsupported source language can be caught before
// any translation runs.
export const detectLanguage = async (sourceText: string) => {
  const { output } = await generateText({
    model: getModel(),
    output: Output.object({ schema: detectionSchema }),
    temperature: 0.2,
    system:
      'Identify the language the given text is written in. Report it as a lowercase ISO 639-1 code ' +
      '(for example: de, en, fr, es, it, pt, nl, pl). Output only the code, nothing else.',
    prompt: sourceText.slice(0, DETECTION_SAMPLE_LENGTH),
  });
  return output.detectedSourceLanguage.trim().toLowerCase();
};
