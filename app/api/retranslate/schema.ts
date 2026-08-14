import { z } from 'zod';

import { languageCodes } from '@/lib/ai/languages';
import { MAX_COMMENT_LENGTH, MAX_SEGMENT_TEXT_LENGTH } from '@/lib/ai/limits';
import { tones } from '@/lib/ai/tone';

// Same reasoning as the translate route's schema: the posted body is checked, not asserted. The
// length bounds matter more here than there — this route is reached with a paragraph and a free
// text comment, and without them a direct caller could hand the model an arbitrarily large prompt
// while the UI's own limit only ever guarded the full-text route.
export const retranslateRequestSchema = z.object({
  // The paragraph as it currently reads in the translation, and the anchor of the whole request:
  // it is by definition the text the user is looking at and commenting on.
  currentTranslation: z.string().trim().min(1).max(MAX_SEGMENT_TEXT_LENGTH),
  // The original paragraph it came from — context for the revision, not its subject. Allowed to be
  // empty because mapping a translated paragraph back to its source is positional, and the model
  // is free to merge or split paragraphs while translating. A revision must still work when that
  // mapping is off rather than silently revising against the wrong paragraph.
  segmentText: z.string().trim().max(MAX_SEGMENT_TEXT_LENGTH),
  sourceLanguage: z.enum(languageCodes).nullable(),
  comment: z.string().trim().max(MAX_COMMENT_LENGTH),
  targetLanguage: z.enum(languageCodes),
  tone: z.enum(tones),
  // Null when the original translation was never persisted (the insert failed) — the
  // re-translation still runs, it just isn't written anywhere.
  translationId: z.uuid().nullable(),
  segmentIndex: z.number().int().min(0),
});

export type RetranslateRequest = z.infer<typeof retranslateRequestSchema>;
