import { describe, expect, it } from 'vitest';
import { cinderCompany } from '../../src/content/decks';
import { opusPh } from '../../src/content/opus-ph';
import type { CardDefinition, Catalog, DeckList } from '../../src/rules/types';
import { mvpFormat, productionFormat, validateDeck } from '../../src/rules/format';

describe('Commander Duel deck validation', () => {
  it('accepts Light and Dark cards while rejecting a wrong standard element', () => {
    const deck = { ...cinderCompany, main: [...cinderCompany.main] };
    deck.main[0] = 'P-007H';
    expect(validateDeck(deck, mvpFormat, opusPh).map(error => error.code)).not.toContain('ELEMENT_MISMATCH');
    deck.main[0] = 'P-008H';
    expect(validateDeck(deck, mvpFormat, opusPh).map(error => error.code)).not.toContain('ELEMENT_MISMATCH');
    deck.main[0] = 'P-021L';
    expect(validateDeck(deck, mvpFormat, opusPh).map(error => error.code)).toContain('ELEMENT_MISMATCH');
  });
  it('rejects duplicate card numbers including a second commander copy', () => {
    const deck = { commander: 'P-001L', main: Array.from({ length: 19 }, () => 'P-002C') };
    expect(validateDeck(deck, mvpFormat, opusPh).map(error => error.code)).toContain('DUPLICATE_CARD');
  });
  it('checks the profile deck size and Commander eligibility', () => {
    const wrongCount = { ...cinderCompany, main: cinderCompany.main.slice(1) };
    expect(validateDeck(wrongCount, mvpFormat, opusPh).map(error => error.code)).toContain('WRONG_DECK_SIZE');
    const wrongCommander = { ...cinderCompany, commander: 'P-009C' };
    expect(validateDeck(wrongCommander, mvpFormat, opusPh).map(error => error.code)).toContain('INVALID_COMMANDER');
    const production = { commander: 'P-001L', main: Array.from({ length: 48 }, () => 'missing') };
    expect(validateDeck(production, productionFormat, opusPh).map(error => error.code)).toContain('WRONG_DECK_SIZE');
  });
  it('rejects both sides of each deck-size boundary and a Commander repeated in its main deck', () => {
    expect(validateDeck({ ...cinderCompany, main: cinderCompany.main.slice(0, 18) }, mvpFormat, opusPh).map(e => e.code)).toContain('WRONG_DECK_SIZE');
    const over = [...cinderCompany.main, 'P-021L'];
    expect(validateDeck({ ...cinderCompany, main: over }, mvpFormat, opusPh).map(e => e.code)).toContain('WRONG_DECK_SIZE');
    expect(validateDeck({ ...cinderCompany, main: ['P-001L', ...cinderCompany.main.slice(0, 18)] }, mvpFormat, opusPh).map(e => e.code)).toContain('DUPLICATE_CARD');
    const wrongRarity = { ...cinderCompany, commander: 'P-002C' };
    expect(validateDeck(wrongRarity, mvpFormat, opusPh).map(e => e.code)).toContain('INVALID_COMMANDER');
  });
  it('accepts exactly 49 distinct custom cards but rejects 48 and 50 in the production profile', () => {
    const commander: CardDefinition = { number: '0-001L', name: 'Leader', set: 'opus-zero', provenance: 'custom', version: 'test-v1', rarity: 'L', type: 'Forward', elements: ['Fire'], cost: 3, power: 7000, jobs: [], categories: [], generic: false, keywords: [], abilities: [], text: '', summonHandler: null, ex: false };
    const entries: CardDefinition[] = Array.from({ length: 50 }, (_, index) => ({ ...commander, number: '0-' + String(index + 2).padStart(3, '0') + 'C', name: 'Card ' + index, rarity: 'C', type: 'Summon', power: null }));
    const catalog: Catalog = Object.fromEntries([commander, ...entries].map(card => [card.number, card]));
    const deckOf = (count: number): DeckList => ({ commander: commander.number, main: entries.slice(0, count).map(card => card.number) });
    expect(validateDeck(deckOf(48), productionFormat, catalog).map(e => e.code)).toContain('WRONG_DECK_SIZE');
    expect(validateDeck(deckOf(49), productionFormat, catalog)).toEqual([]);
    expect(validateDeck(deckOf(50), productionFormat, catalog).map(e => e.code)).toContain('WRONG_DECK_SIZE');
  });
});
