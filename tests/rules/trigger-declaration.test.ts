import { describe, expect, it } from 'vitest';
import { scheduleEntryAbilities } from '../../src/rules/triggers';
import { context, fixture } from '../support/harness';

describe('card event subscriptions', () => {
  it('does not trigger a Forward departure ability when its Backup source enters', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-014R', zone: 'field' }, { seat: 0, card: 'P-003C', zone: 'field' },
    ] });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-014R')!;
    scheduleEntryAbilities(h.state, source.instance, context);
    expect(h.state.stack.map(item => item.handler)).not.toContain('cinder-witness-damage');
  });

  it('collects a printed entry ability when its Character enters', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-011R', zone: 'field' }] });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-011R')!;
    scheduleEntryAbilities(h.state, source.instance, context);
    expect(h.state.stack.map(item => item.handler)).toContain('quartermaster-search');
  });
});
