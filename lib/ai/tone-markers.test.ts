import { describe, expect, it } from 'vitest';

import { classifyRegister } from '@/lib/ai/tone-markers';

// The heuristic behind the FA-08 tone report. It is only worth reporting a hit rate from it if it
// classifies known-formal and known-informal business prose correctly, so the cases here are the
// ones the report's numbers stand on.
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

    // The reason the German patterns are case-sensitive: "sie" is far more often "she"/"they" than
    // a miscased polite address, and counting it as formal would inflate every German result.
    it('does not read lowercase "sie" as the polite address', () => {
      const analysis = classifyRegister('Wir haben sie gestern informiert.', 'de');
      expect(analysis.formalMatches).toHaveLength(0);
      expect(analysis.register).toBe('ambiguous');
    });

    it('reports a text that addresses nobody as ambiguous', () => {
      expect(classifyRegister('Die Lieferung erfolgt am Montag.', 'de').register).toBe('ambiguous');
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
  });

  describe('English', () => {
    // English has no T–V distinction, so the instruction's checkable claim is the contraction ban.
    it('reads contractions as informal', () => {
      expect(classifyRegister("Hi Anna, we'll send the quote tomorrow.", 'en').register).toBe(
        'informal'
      );
    });

    it('reads contraction-free prose as formal', () => {
      const text =
        'Dear Ms Berger, we will send you the revised quotation tomorrow and would appreciate ' +
        'your confirmation.';
      expect(classifyRegister(text, 'en').register).toBe('formal');
    });

    // A possessive is not a contraction — without this distinction ordinary formal business prose
    // ("the company's offer") would be scored as informal.
    it('does not mistake a possessive for a contraction', () => {
      expect(classifyRegister("We have received the company's offer.", 'en').register).toBe(
        'formal'
      );
    });
  });
});
