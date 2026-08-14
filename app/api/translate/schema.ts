import { z } from 'zod';

import { languageCodes } from '@/lib/ai/languages';
import { MAX_SOURCE_TEXT_LENGTH } from '@/lib/ai/limits';
import { tones } from '@/lib/ai/tone';

// The route's input contract. A route handler receives whatever was posted to it, so the shape has
// to be checked rather than asserted with a type annotation — the UI is one caller, not the only
// possible one. targetLanguage in particular is interpolated into the prompt, so it is constrained
// to the FA-06 catalog here instead of being trusted as a free-form string.
export const translateRequestSchema = z.object({
  sourceText: z.string().trim().min(1).max(MAX_SOURCE_TEXT_LENGTH),
  targetLanguage: z.enum(languageCodes),
  tone: z.enum(tones),
});

export type TranslateRequest = z.infer<typeof translateRequestSchema>;
