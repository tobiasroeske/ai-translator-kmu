import { type LanguageCode } from '@/lib/ai/languages';

// Reads the grammatical register off a translated text, for the FA-08 validation script
// (scripts/validate-tone.mjs). Nothing in the request path uses it.
//
// It checks the one claim the tone instructions make that a machine can verify: the form of
// address (Sie / vous / usted), and for English, which has no T–V distinction, the absence of
// contractions. Whether a text reads as formal beyond that is a judgment call, not a check.

export type Register = 'formal' | 'informal' | 'ambiguous';

export type RegisterAnalysis = {
  register: Register;
  formalMatches: string[];
  informalMatches: string[];
};

type RegisterMarkers = {
  formal: RegExp[];
  informal: RegExp[];
  // English has no positive formal marker to count: the claim is the absence of contractions, so
  // no markers of either kind means formal rather than ambiguous.
  formalWhenNoInformalMarker: boolean;
};

// The German formal patterns are case-sensitive: German capitalises the polite address, and
// matching case-insensitively would count every "sie" ("she"/"they") as one.
const markers: Record<LanguageCode, RegisterMarkers> = {
  de: {
    formal: [/\bSie\b/g, /\bIhnen\b/g, /\bIhr(?:e|em|en|er|es)?\b/g],
    informal: [
      /\bdu\b/gi,
      /\bdir\b/gi,
      /\bdich\b/gi,
      /\bdein(?:e|em|en|er|es)?\b/gi,
      /\beuch\b/gi,
      /\beu(?:er|re|rem|ren|rer|res)\b/gi,
    ],
    formalWhenNoInformalMarker: false,
  },
  fr: {
    formal: [/\bvous\b/gi, /\bvotre\b/gi, /\bvos\b/gi],
    informal: [/\btu\b/gi, /\bte\b/gi, /\btoi\b/gi, /\bton\b/gi, /\bta\b/gi, /\btes\b/gi],
    formalWhenNoInformalMarker: false,
  },
  es: {
    formal: [/\busted(?:es)?\b/gi, /\bsus?\b/gi, /\ble\b/gi, /\bles\b/gi],
    informal: [/\btú\b/gi, /\btu\b/gi, /\btus\b/gi, /\bti\b/gi, /\bte\b/gi, /\bcontigo\b/gi],
    formalWhenNoInformalMarker: false,
  },
  en: {
    formal: [],
    // Spelled out rather than matched as a generic apostrophe pattern, which would also catch
    // possessives like "the company's offer".
    informal: [
      /\b(?:i'm|you're|we're|they're|it's|that's|there's|here's|let's)\b/gi,
      /\b(?:don't|doesn't|didn't|can't|won't|wouldn't|shouldn't|couldn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't)\b/gi,
      /\b(?:i'll|you'll|we'll|they'll|he'll|she'll|i've|you've|we've|they've|i'd|you'd|we'd|they'd)\b/gi,
    ],
    formalWhenNoInformalMarker: true,
  },
};

const countMatches = (text: string, patterns: RegExp[]) =>
  patterns.flatMap((pattern) => text.match(pattern) ?? []);

export const classifyRegister = (text: string, language: LanguageCode): RegisterAnalysis => {
  const { formal, informal, formalWhenNoInformalMarker } = markers[language];

  // Typographic apostrophes are normalised so the English contraction list matches either form.
  const normalised = text.replace(/['’]/g, "'");

  const formalMatches = countMatches(normalised, formal);
  const informalMatches = countMatches(normalised, informal);

  if (formalWhenNoInformalMarker) {
    return {
      register: informalMatches.length > 0 ? 'informal' : 'formal',
      formalMatches,
      informalMatches,
    };
  }

  // A tie — including a text that addresses nobody — is reported rather than guessed: a short
  // paragraph can legitimately carry no form of address.
  if (formalMatches.length === informalMatches.length) {
    return { register: 'ambiguous', formalMatches, informalMatches };
  }

  return {
    register: formalMatches.length > informalMatches.length ? 'formal' : 'informal',
    formalMatches,
    informalMatches,
  };
};
