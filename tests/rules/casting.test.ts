import { describe, expect, it } from 'vitest';
import { castCharacter } from '../../src/rules/casting';
import { commanderCost } from '../../src/rules/commander';
import { fixture, context } from '../support/harness';
import { moveCard } from '../../src/rules/zones';
import type { Payment } from '../../src/rules/types';

const payBackups = (h: ReturnType<typeof fixture>, cost: number): Payment => {
  const backups = ['P-009C','P-010C','P-011R'];
  const selected = backups.slice(0, cost).map(card => h.object(0, card));
  return {
    discard: [], dullBackups: selected, specialDiscard: null, dullSource: false, sacrificeSource: false,
    sourceElements: Object.fromEntries(selected.map(object => [object, 'Fire'])), spend: { Fire: cost },
  };
};
const instanceOf = (h: ReturnType<typeof fixture>, number: string) => Object.values(h.state.cards).find(card => card.card === number)!.instance;
describe('Character casting', () => {
  it('casts the Commander from its Zone at base cost, then adds tax to its next Zone cast', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-010C', zone: 'field' },
      { seat: 0, card: 'P-011R', zone: 'field' },
    ] });
    const commander = h.state.commanders[0].instance;
    const source = h.state.cards[commander]!.object;
    expect(commanderCost(h.state, commander, context)).toBe(3);
    expect(castCharacter(h.state, 0, source, payBackups(h, 3), context)).toEqual([]);
    expect(h.state.cards[commander]!.zone).toBe('field');
    expect(h.state.commanders[0].casts).toBe(1);
    moveCard(h.state, commander, 'commander');
    expect(commanderCost(h.state, commander, context)).toBe(5);
  });
  it('rejects an illegal Backup limit without dulling sources or moving the card', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-010C', zone: 'field' },
      { seat: 0, card: 'P-011R', zone: 'field' }, { seat: 0, card: 'P-012H', zone: 'field' },
      { seat: 0, card: 'P-013R', zone: 'field' }, { seat: 0, card: 'P-014R', zone: 'hand' },
    ] });
    h.state.cards[h.object(0, 'P-013R').replace('o0', 'i0')]!.zone = 'field';
    const backup = h.object(0, 'P-014R');
    const sources = ['P-009C','P-010C'].map(card => h.object(0, card));
    const payment: Payment = { discard: [], dullBackups: sources, specialDiscard: null, dullSource: false, sacrificeSource: false, sourceElements: Object.fromEntries(sources.map(object => [object, 'Fire'])), spend: { Fire: 2 } };
    expect(castCharacter(h.state, 0, backup, payment, context).map(e => e.code)).toContain('BACKUP_LIMIT');
    expect(h.state.cards[instanceOf(h, 'P-014R')]!.zone).toBe('hand');
    expect(h.state.cards[instanceOf(h, 'P-009C')]!.dull).toBe(false);
  });
  it('rejects a Commander cast during an opponent priority pass', () => {
    const h = fixture({ priority: 1 });
    expect(castCharacter(h.state, 0, h.object(0, 'P-001L'), payBackups(h, 3), context).map(e => e.code)).toContain('WRONG_TIMING');
  });
  it('permits two generic copies of the same name but rejects a second nongeneric copy', () => {
    const generic = fixture({ placements: [
      { seat: 0, card: 'P-003C', zone: 'field' },
      { seat: 0, card: 'P-004C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-010C', zone: 'field' },
    ] });
    expect(castCharacter(generic.state, 0, generic.object(0, 'P-004C'), payBackups(generic, 2), context)).toEqual([]);
    expect(generic.state.cards[instanceOf(generic, 'P-004C')]!.zone).toBe('field');
    const named = fixture({ placements: [
      { seat: 0, card: 'P-001L', zone: 'field' },
      { seat: 0, card: 'P-002C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-010C', zone: 'field' },
    ] });
    expect(castCharacter(named.state, 0, named.object(0, 'P-002C'), payBackups(named, 2), context).map(e => e.code)).toContain('DUPLICATE_NAME');
  });
});
