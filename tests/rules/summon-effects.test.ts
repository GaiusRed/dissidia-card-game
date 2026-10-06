import { describe, expect, it } from 'vitest';
import { effectivePower, hasKeyword } from '../../src/rules/continuous';
import { applyCommand } from '../../src/rules/engine';
import { context, fixture } from '../support/harness';

function cast(state: ReturnType<typeof fixture>['state'], seat: 0 | 1, source: string, targets: string[], payment: object, mode: string | null = null) {
  return applyCommand(state, { id: `summon-${state.seq}`, expectedSeq: state.seq, seat, intent: {
    kind: 'cast', source, targets, mode, payment: payment as never,
  } }, context);
}
function pass(state: ReturnType<typeof fixture>['state'], seat: 0 | 1) {
  return applyCommand(state, { id: `pass-${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
}
describe('placeholder Summon effects', () => {
  it('grants War Cry power and Brave until end of turn', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-017R', zone: 'hand' }, { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-005R', zone: 'field' },
    ] });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-017R')!;
    const backup = Object.values(state.cards).find(card => card.card === 'P-009C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-005R')!;
    const reply = cast(state, 0, source.object, [target.object], { discard: [], dullBackups: [backup.object], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [backup.object]: 'Fire' }, spend: { Fire: 1 } });
    if (!reply.ok) throw new Error(reply.error.message); state = reply.state;
    for (const seat of [1, 0] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(effectivePower(state, target.object, context)).toBe(7000);
    expect(hasKeyword(state, target.object, 'Brave', context)).toBe(true);
  });

  it('asks the Commander owner when Return Tide targets their Commander', () => {
    const h = fixture({ priority: 1, placements: [
      { seat: 1, card: 'P-035C', zone: 'hand' }, { seat: 1, card: 'P-023C', zone: 'hand' },
      { seat: 0, card: 'P-001L', zone: 'field' },
    ] });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-035C')!;
    const discard = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    const commander = Object.values(state.cards).find(card => card.card === 'P-001L')!;
    const reply = cast(state, 1, source.object, [commander.object], { discard: [discard.object], dullBackups: [], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [discard.object]: 'Water' }, spend: { Water: 2 } });
    if (!reply.ok) throw new Error(reply.error.message); state = reply.state;
    for (const seat of [0, 1] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.choice?.seat).toBe(0);
    expect(state.cards[commander.instance]!.zone).toBe('field');
    const choice = state.choice!;
    const decision = applyCommand(state, { id: 'return-commander', expectedSeq: state.seq, seat: 0, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: ['return'], amounts: {} },
    } }, context);
    expect(decision.ok).toBe(true);
    if (decision.ok) expect(decision.state.cards[commander.instance]!.zone).toBe('commander');
  });

  it('breaks a Backup or removes a Forward based on Controlled Burn mode', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-020H', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 1, card: 'P-029C', zone: 'field' },
    ] });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-020H')!;
    const discard = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const backup = Object.values(state.cards).find(card => card.card === 'P-009C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-029C')!;
    const reply = cast(state, 0, source.object, [target.object], { discard: [discard.object], dullBackups: [backup.object], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [discard.object]: 'Fire', [backup.object]: 'Fire' }, spend: { Fire: 3 } }, 'backup');
    if (!reply.ok) throw new Error(reply.error.message); state = reply.state;
    for (const seat of [1, 0] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.cards[target.instance]!.zone).toBe('break');
  });

  it('gives control through the turn and returns the card to its owner at turn end', () => {
    const h = fixture({ phase: 'end', priority: 1, placements: [
      { seat: 1, card: 'P-039H', zone: 'hand' }, { seat: 1, card: 'P-022C', zone: 'hand' }, { seat: 1, card: 'P-023C', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'field' },
    ] });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-039H')!;
    const firstDiscard = Object.values(state.cards).find(card => card.card === 'P-022C')!;
    const secondDiscard = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const reply = cast(state, 1, source.object, [target.object], { discard: [firstDiscard.object, secondDiscard.object], dullBackups: [], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [firstDiscard.object]: 'Water', [secondDiscard.object]: 'Water' }, spend: { Water: 4 } });
    if (!reply.ok) throw new Error(reply.error.message); state = reply.state;
    for (const seat of [0, 1] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.cards[target.instance]!.controller).toBe(1);
    for (const seat of [0, 1] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.active).toBe(1);
    expect(state.cards[target.instance]!.controller).toBe(0);
  });

  it('Rising Undertow draws two cards and requires one discard in the End Phase', () => {
    const h = fixture({ phase: 'main2', active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-040R', zone: 'hand' }, { seat: 1, card: 'P-022C', zone: 'hand' },
    ], deckTop: { 1: ['P-024C', 'P-025R'] } });
    let state = h.state;
    const summon = Object.values(state.cards).find(card => card.card === 'P-040R')!;
    const discard = Object.values(state.cards).find(card => card.card === 'P-022C')!;
    const reply = cast(state, 1, summon.object, [], { discard: [discard.object], dullBackups: [], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [discard.object]: 'Water' }, spend: { Water: 2 } });
    if (!reply.ok) throw new Error(reply.error.message); state = reply.state;
    for (const seat of [0, 1] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.zones[1].hand).toHaveLength(2);
    for (const seat of [1, 0] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.phase).toBe('end');
    expect(state.stack).toHaveLength(1);
    for (const seat of [0, 1] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.choice?.seat).toBe(1);
    expect(state.choice?.reason).toContain('discard');
    const selected = state.cards[state.zones[1].hand[0]!]!;
    const decision = applyCommand(state, { id: 'undertow-discard', expectedSeq: state.seq, seat: 1, intent: {
      kind: 'answer', answer: { choice: state.choice!.id, selected: [selected.object], amounts: {} },
    } }, context);
    expect(decision.ok).toBe(true);
    if (decision.ok) expect(decision.state.cards[selected.instance]!.zone).toBe('break');
  });

  it('Dawn Guardian reduces each damage instance by 1000', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-015C', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-008H', zone: 'field' },
    ] });
    let state = h.state;
    const summon = Object.values(state.cards).find(card => card.card === 'P-015C')!;
    const discard = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const guardian = Object.values(state.cards).find(card => card.card === 'P-008H')!;
    const reply = cast(state, 0, summon.object, [guardian.object], { discard: [discard.object], dullBackups: [], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [discard.object]: 'Fire' }, spend: { Fire: 1 } });
    if (!reply.ok) throw new Error(reply.error.message); state = reply.state;
    for (const seat of [1, 0] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.cards[guardian.instance]!.damage).toBe(3000);
  });
});
