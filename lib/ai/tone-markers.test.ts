import { describe, expect, it } from 'vitest';

import { classifyRegister } from '@/lib/ai/tone-markers';

// The heuristic behind the FA-08 tone report: its hit rate only means something if it classifies
// known-formal and known-informal business prose correctly, and if the two ways of missing a
// register — mixing both and carrying neither — stay apart.
describe('classifyRegister', () => {
  describe('German', () => {
    it('reads the capitalised polite address as formal', () => {
      const text =
        'Sehr geehrte Frau Berger, können Sie uns bitte bestätigen, ob Ihnen die Zeichnungen ' +
        'vorliegen? Ihre Rückmeldung erreicht uns am besten per E-Mail.';
      expect(classifyRegister(text, 'de').register).toBe('formal');
    });

    it('reads the du-form as informal', () => {
      const text =
        'Hallo Anna, kannst du mir bitte kurz bestätigen, ob dir die Zeichnungen vorliegen? ' +
        'Deine Rückmeldung brauche ich bis Freitag.';
      expect(classifyRegister(text, 'de').register).toBe('informal');
    });

    // "sie" is far more often "she"/"they" than a miscased polite address; counting it as formal
    // would inflate every German result.
    it('does not read lowercase "sie" as the polite address', () => {
      const analysis = classifyRegister('Wir haben sie gestern informiert.', 'de');
      expect(analysis.formalMatches).toHaveLength(0);
      expect(analysis.register).toBe('ambiguous');
    });

    it('reports a text that addresses nobody as ambiguous', () => {
      expect(classifyRegister('Die Lieferung erfolgt am Montag.', 'de').register).toBe('ambiguous');
    });

    it('reads a formal salutation as formal even without a pronoun', () => {
      const analysis = classifyRegister(
        'Sehr geehrte Frau Berger, die Lieferung erfolgt am Montag.',
        'de'
      );
      expect(analysis.register).toBe('formal');
    });
  });

  describe('French', () => {
    it('reads vouvoiement as formal and tutoiement as informal', () => {
      expect(
        classifyRegister('Pourriez-vous confirmer votre commande, Madame ?', 'fr').register
      ).toBe('formal');
      expect(classifyRegister('Peux-tu confirmer ta commande ?', 'fr').register).toBe('informal');
    });
  });

  describe('Spanish', () => {
    it('reads the usted form as formal and the tú form as informal', () => {
      expect(
        classifyRegister('¿Podría usted confirmarnos su pedido, estimada señora?', 'es').register
      ).toBe('formal');
      expect(classifyRegister('¿Puedes confirmarnos tú tu pedido?', 'es').register).toBe(
        'informal'
      );
    });

    // Spanish omits the subject pronoun in most business prose, so a classifier reading pronouns
    // alone finds nothing to go on in the majority of real outputs.
    it('reads the tú address off the verb form when the pronoun is dropped', () => {
      const analysis = classifyRegister(
        '¿Podrías confirmarnos antes del viernes si has recibido los planos?',
        'es'
      );
      expect(analysis.register).toBe('informal');
      expect(analysis.informalMatches).toContain('Podrías');
      expect(analysis.informalMatches).toContain('has');
    });

    // The usted counterpart of those verb forms is a third-person homograph, so it is deliberately
    // not read as an address — this text has no marker at all rather than a formal one.
    it('does not read the pronoun-less usted form as formal', () => {
      expect(
        classifyRegister('¿Podría confirmarnos si ha recibido los planos?', 'es').register
      ).toBe('ambiguous');
    });

    // `\b` cannot close a marker that ends in an accented letter, which silently disabled this one.
    it('matches the accented "tú" pronoun', () => {
      expect(classifyRegister('Confirma tú el pedido.', 'es').informalMatches).toContain('tú');
    });
  });

  describe('English', () => {
    // No T–V distinction, so the markers are contractions and the salutation/closing.
    it('reads contractions as informal', () => {
      expect(classifyRegister("Hi Anna, we'll send the quote tomorrow.", 'en').register).toBe(
        'informal'
      );
    });

    it('reads a formal salutation and closing as formal', () => {
      const text =
        'Dear Ms Berger, we will send you the revised quotation tomorrow and would appreciate ' +
        'your confirmation. Kind regards';
      expect(classifyRegister(text, 'en').register).toBe('formal');
    });

    // A possessive is not a contraction, or ordinary formal business prose would score informal.
    it('does not mistake a possessive for a contraction', () => {
      const analysis = classifyRegister("We have received the company's offer.", 'en');
      expect(analysis.informalMatches).toHaveLength(0);
    });

    // Absence of contractions is not evidence of formality: it used to be scored as formal, which
    // assigned a register to prose carrying no marker at all.
    it('reports contraction-free prose without a salutation as ambiguous', () => {
      expect(
        classifyRegister('Thanks for your inquiry. Let us know how many units you need.', 'en')
          .register
      ).toBe('ambiguous');
    });
  });

  describe('mixed register', () => {
    // The failure the tone instructions' consistency requirement exists for: the register applied
    // to part of the text only. A count comparison reported this as `ambiguous` on a tie, which
    // the report then described as "carried no form of address either way".
    it('reports a text carrying both registers as mixed', () => {
      const analysis = classifyRegister(
        'Merci beaucoup pour votre demande. Dis-nous combien tu en as besoin.',
        'fr'
      );
      expect(analysis.register).toBe('mixed');
      expect(analysis.formalMatches).toContain('votre');
      expect(analysis.informalMatches.length).toBeGreaterThan(0);
    });

    it('does not let a lone opposite marker outweigh the rest', () => {
      const analysis = classifyRegister(
        'Hallo Anna, kannst du mir sagen, ob Sie die Zeichnungen bekommen haben?',
        'de'
      );
      expect(analysis.register).toBe('mixed');
    });
  });
});
