import { type LanguageCode } from '@/lib/ai/languages';

// Reads the register off a translated text, for the FA-08 validation script
// (scripts/validate-tone.mjs). Nothing in the request path uses it.
//
// Two kinds of marker carry the register, and both count as evidence:
//   - the form of address — the pronouns (Sie / vous / usted), plus the verb forms that carry it
//     in Spanish, which drops the subject pronoun in most business prose;
//   - the salutation and closing — the one register signal every target language has, including
//     English, which has no T–V distinction to read.
//
// Every marker is positive evidence, and nothing is read out of an absence: a text carrying no
// marker is reported as `ambiguous` rather than assigned a register, and one carrying markers of
// both registers as `mixed`. The tone instructions ask for one register across the whole text, so
// a text mixing both fails that differently than one that addresses nobody — the two are reported
// apart rather than collapsed.

export type Register = 'formal' | 'informal' | 'mixed' | 'ambiguous';

export type RegisterAnalysis = {
  register: Register;
  formalMatches: string[];
  informalMatches: string[];
};

// `\b` is defined over [A-Za-z0-9_] only, so a marker ending in an accented letter can never
// match: the closing `\b` would need a word character right after a non-word one. Unicode-aware
// lookarounds give every marker the same boundaries whatever letters it is spelled with.
const buildMarker = (pattern: string, flags: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, flags);

const marker = (pattern: string) => buildMarker(pattern, 'giu');

// German capitalises the polite address, so these stay case-sensitive: matching case-insensitively
// would count every "sie" ("she"/"they") as a polite address and inflate every German result.
const casedMarker = (pattern: string) => buildMarker(pattern, 'gu');

type RegisterMarkers = {
  formal: RegExp[];
  informal: RegExp[];
};

const markers: Record<LanguageCode, RegisterMarkers> = {
  de: {
    formal: [
      casedMarker('Sie'),
      casedMarker('Ihnen'),
      casedMarker('Ihr(?:e|em|en|er|es)?'),
      marker('sehr geehrte[rs]?'),
      marker('mit freundlichen Grüßen'),
      marker('hochachtungsvoll'),
    ],
    informal: [
      marker('du'),
      marker('dir'),
      marker('dich'),
      marker('dein(?:e|em|en|er|es)?'),
      marker('euch'),
      marker('eu(?:er|re|rem|ren|rer|res)'),
      marker('hallo'),
      marker('hi'),
      marker('hey'),
      marker('liebe Grüße'),
      marker('bis bald'),
      marker('ciao'),
    ],
  },
  fr: {
    formal: [
      marker('vous'),
      marker('votre'),
      marker('vos'),
      marker('veuillez'),
      marker('madame'),
      marker('monsieur'),
      marker('cordialement'),
      marker('dites-(?:moi|nous)'),
    ],
    informal: [
      marker('tu'),
      marker('te'),
      marker('toi'),
      marker('ton'),
      marker('ta'),
      marker('tes'),
      marker('salut'),
      marker('coucou'),
      marker('bises'),
      marker('à plus'),
      marker('dis-(?:moi|nous)'),
    ],
  },
  es: {
    // `su`/`sus`/`le`/`les` are deliberately absent: they are equally the third-person forms, so
    // they fire on prose that addresses nobody. Under presence-based classification a single
    // spurious match flips a verdict to `mixed`, which a count comparison used to absorb.
    formal: [
      marker('usted(?:es)?'),
      marker('estimad[oa]s?'),
      marker('atentamente'),
      marker('muy señor(?:es)?'),
      marker('(?:díga|indíque|envíe|confírme|comuníque)nos'),
    ],
    // Spanish omits the subject pronoun in most business prose, so the address lives in the verb
    // ending. These are second-person singular forms with no third-person homograph — the usted
    // side has one (ha, tiene, podría) and is left to the pronoun and salutation markers above.
    informal: [
      marker('tú'),
      marker('tu'),
      marker('tus'),
      marker('ti'),
      marker('te'),
      marker('contigo'),
      marker('has'),
      marker('tienes'),
      marker('puedes'),
      marker('podrías'),
      marker('quieres'),
      marker('necesitas'),
      marker('eres'),
      marker('estás'),
      marker('sabes'),
      marker('debes'),
      marker('confirmas'),
      marker('confirmarías'),
      marker('(?:dí|cuénta|enví|aví|mánda)(?:me|nos)'),
      marker('hola'),
      marker('un abrazo'),
    ],
  },
  en: {
    formal: [
      marker('dear (?:mr|mrs|ms|miss|sir|madam)'),
      marker('to whom it may concern'),
      marker('yours (?:sincerely|faithfully|truly)'),
      marker('kind regards'),
    ],
    // Spelled out rather than matched as a generic apostrophe pattern, which would also catch
    // possessives like "the company's offer".
    informal: [
      marker("i'm|you're|we're|they're|it's|that's|there's|here's|let's"),
      marker(
        "don't|doesn't|didn't|can't|won't|wouldn't|shouldn't|couldn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't"
      ),
      marker("i'll|you'll|we'll|they'll|he'll|she'll|i've|you've|we've|they've|i'd|you'd|we'd"),
      marker('hi|hey|hiya'),
      marker('cheers'),
      marker('(?:talk|speak) soon'),
    ],
  },
};

const countMatches = (text: string, patterns: RegExp[]) =>
  patterns.flatMap((pattern) => text.match(pattern) ?? []);

export const classifyRegister = (text: string, language: LanguageCode): RegisterAnalysis => {
  const { formal, informal } = markers[language];

  // Typographic apostrophes are normalised so the English contraction list matches either form.
  const normalised = text.replace(/['’]/g, "'");

  const formalMatches = countMatches(normalised, formal);
  const informalMatches = countMatches(normalised, informal);

  if (formalMatches.length > 0 && informalMatches.length > 0) {
    return { register: 'mixed', formalMatches, informalMatches };
  }

  if (formalMatches.length === 0 && informalMatches.length === 0) {
    return { register: 'ambiguous', formalMatches, informalMatches };
  }

  return {
    register: formalMatches.length > 0 ? 'formal' : 'informal',
    formalMatches,
    informalMatches,
  };
};
