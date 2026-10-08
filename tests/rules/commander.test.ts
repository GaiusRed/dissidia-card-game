import { describe, expect, it } from 'vitest';
import { commanderCost } from '../../src/rules/commander';
import { requestDeparture } from '../../src/rules/commander';
import { applyCommand } from '../../src/rules/engine';
import { projectView } from '../../src/host/views';
import { fixture, context } from '../support/harness';

describe('Commander tax', () => {
  it('adds two CP per successful Commander Zone cast and does not tax a hand cast', () => {
    const h = fixture({ commanderCasts: { 0: 2 } });
    const instance = h.state.commanders[0].instance;
    expect(commanderCost(h.state, instance, context)).toBe(7);
    h.state.cards[instance]!.zone = 'hand';
    expect(commanderCost(h.state, instance, context)).toBe(3);
  });
  it('does not tax another card with the same name', () => {
    const h = fixture({ commanderCasts: { 0: 2 } });
    const namesake = Object.values(h.state.cards).find(card => card.card === 'P-002C')!;
    expect(commanderCost(h.state, namesake.instance, context)).toBe(2);
  });
  it('asks the Commander owner when another player controls it as it leaves the field', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-001L', zone: 'field' }] });
    const instance = h.state.commanders[0].instance;
    h.state.cards[instance]!.controller = 1;
    const before = h.state.cards[instance]!.object;
    requestDeparture(h.state, instance, 'break');
    expect(h.state.choice?.seat).toBe(0);
    expect(h.state.cards[instance]!.zone).toBe('field');
    const choice = h.state.choice!;
    const result = applyCommand(h.state, { id: 'commander-return', expectedSeq: h.state.seq, seat: 0,
      intent: { kind: 'answer', answer: { choice: choice.id, selected: ['return'], amounts: {} } } }, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.cards[instance]!.zone).toBe('commander');
    expect(result.state.cards[instance]!.object).not.toBe(before);
    expect(h.state.commanders[0].casts).toBe(0);
  });
  it('uses the normal destination if its owner declines the replacement', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-001L', zone: 'field' }] });
    const instance = h.state.commanders[0].instance;
    requestDeparture(h.state, instance, 'break');
    const choice = h.state.choice!;
    const result = applyCommand(h.state, { id: 'commander-decline', expectedSeq: h.state.seq, seat: 0,
      intent: { kind: 'answer', answer: { choice: choice.id, selected: ['destination'], amounts: {} } } }, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.zones[0].break).toEqual([instance]);
  });
  it('preserves the Commander instance when its normal departure destination is the Damage Zone', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-001L', zone: 'field' }] });
    const instance = h.state.commanders[0].instance;
    const object = h.state.cards[instance]!.object;
    requestDeparture(h.state, instance, 'damage', context);
    const choice = h.state.choice!;

    const result = applyCommand(h.state, { id: 'commander-damage-destination', expectedSeq: h.state.seq, seat: 0,
      intent: { kind: 'answer', answer: { choice: choice.id, selected: ['destination'], amounts: {} } } }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.zones[0].damage).toEqual([instance]);
    expect(result.state.cards[instance]!.zone).toBe('damage');
    expect(result.state.cards[instance]!.object).not.toBe(object);
    expect(result.state.commanders[0].instance).toBe(instance);
    const view = projectView(result.state, 0, [], context);
    expect(view.zones[0].damage).toEqual([instance]);
    expect(view.presentations[result.state.cards[instance]!.object]).toMatchObject({ commander: true, zone: 'damage' });
  });
});
