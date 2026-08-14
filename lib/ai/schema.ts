import { z } from 'zod';

// What the model is asked to produce: the translation, nothing else.
//
// The source language is not part of this. It is established before the stream starts (see
// lib/ai/detect-language.ts) and travels to the client in a response header — asking the model for
// it a second time would produce a second, unvalidated answer that could contradict the one the
// FA-06 catalog check was made against.
//
// Neither is an "AI generated" flag. That the output is machine-generated is a fact the
// application knows with certainty; making it a generated field would put an FA-05 labelling
// obligation at the mercy of the model's token sampling.
export const translationOutputSchema = z.object({
  translatedText: z.string().describe('The translated text'),
});
