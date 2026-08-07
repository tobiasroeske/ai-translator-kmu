import { createEnumGuard } from '@/lib/utils';

export const tones = ['formal', 'informal', 'neutral'] as const;

export type Tone = (typeof tones)[number];

export const toneLabels: Record<Tone, string> = {
  formal: 'Formell',
  informal: 'Locker',
  neutral: 'Neutral',
} as const satisfies Record<Tone, string>;

// Spelled out for the model rather than passing just the tone name — "formal"/"informal" don't
// map onto a fixed grammatical form across target languages (only some, like German/French/
// Spanish, distinguish formal/informal address at all), so the register has to be described.
//
// Deliberately free of quoted example phrases: the translation is generated as a JSON string
// under grammar-constrained decoding, where closing the string early is always syntactically
// legal. A quoted example that resembles the text being generated (a greeting, say) biases a
// small model into completing that pattern — ending the translation right there. Describe the
// register instead of quoting sample phrasing.
export const toneInstructions: Record<Tone, string> = {
  formal:
    'Formal business register, as in a professional letter or email to a business partner you do not know personally: use the polite form of address where the target language distinguishes one (Sie in German, vous in French, usted in Spanish). Full sentences, no contractions, no colloquialisms. Greetings and closings should read as formal business correspondence appropriate for the addressee, not as a word-for-word translation.',
  informal:
    'Casual, conversational register, as in a quick email between colleagues who know each other well: use the informal form of address where the target language distinguishes one (du in German, tu in French and Spanish). Contractions, everyday vocabulary and relaxed sentence structure — write the way you would actually message a colleague, not a slightly softened formal letter. Greetings and closings should read as casual rather than as formal business correspondence.',
  neutral:
    'Standard professional business register, as in routine day-to-day correspondence with an established but not personal contact: balanced word choice, complete sentences, moderate formality — neither a stiff formal letter nor a casual chat message.',
} as const satisfies Record<Tone, string>;

export const isSupportedTone = createEnumGuard(tones);
