import { describe, expect, it } from 'vitest';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { opusPh } from '../../src/content/manifest';
import { mvpFormat, productionFormat, validateDeck } from '../../src/rules/format';

describe('registered card content', () => {
  it('keeps unique, complete metadata for every registered card', () => {
    const cards = Object.values(opusPh);
    expect(cards.length).toBeGreaterThan(0);
    expect(new Set(cards.map(card => card.number)).size).toBe(cards.length);
    for (const card of cards) {
      expect(card.name.trim(), card.number).not.toBe('');
      expect(card.set.trim(), card.number).not.toBe('');
      expect(card.elements.length, card.number).toBeGreaterThan(0);
      expect(Number.isSafeInteger(card.cost) && card.cost >= 0, card.number).toBe(true);
      expect(card.text, card.number).toBeDefined();
    }
  });

  it('keeps both placeholder decks valid for the MVP profile and out of production', () => {
    expect(cinderCompany.main).toHaveLength(mvpFormat.mainSize);
    expect(tidalAssembly.main).toHaveLength(mvpFormat.mainSize);
    expect(validateDeck(cinderCompany, mvpFormat, opusPh)).toEqual([]);
    expect(validateDeck(tidalAssembly, mvpFormat, opusPh)).toEqual([]);
    expect(validateDeck(cinderCompany, productionFormat, opusPh).map(error => error.code)).toContain('SET_NOT_ALLOWED');
  });
});
