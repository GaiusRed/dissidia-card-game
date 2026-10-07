import { describe, expect, it } from 'vitest';
import { effectivePower } from '../../src/rules/continuous';
import { applyCommand } from '../../src/rules/engine';
import { requestDeparture } from '../../src/rules/commander';
import { context, fixture } from '../support/harness';

describe('automatic abilities', () => {
  it('puts an entry ability on the stack and asks its controller to choose a Forward', () => {
    const h = fixture({ priority: 0, placements: [
      { seat: 0, card: 'P-007H', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-004C', zone: 'hand' }, { seat: 1, card: 'P-023C', zone: 'field' },
    ] });
    let state = h.state;
    const reaver = Object.values(state.cards).find(card => card.card === 'P-007H')!;
    const first = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const second = Object.values(state.cards).find(card => card.card === 'P-004C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    const cast = applyCommand(state, { id: 'reaver-cast', expectedSeq: state.seq, seat: 0, intent: {
      kind: 'cast', source: reaver.object, targets: [], mode: null, payment: {
        discard: [first.object, second.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [first.object]: 'Fire', [second.object]: 'Fire' }, spend: { Fire: 3 },
      },
    } }, context);
    expect(cast.ok).toBe(true);
    if (!cast.ok) return;
    state = cast.state;
    expect(state.stack).toHaveLength(1);
    for (const seat of [1, 0] as const) {
      const passed = applyCommand(state, { id: `pass-${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      expect(passed.ok).toBe(true);
      if (!passed.ok) return;
      state = passed.state;
    }
    expect(state.choice?.seat).toBe(0);
    const choice = state.choice!;
    const answered = applyCommand(state, { id: 'reaver-target', expectedSeq: state.seq, seat: 0, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: [target.object], amounts: {} },
    } }, context);
    expect(answered.ok).toBe(true);
    if (answered.ok) expect(effectivePower(answered.state, target.object, context)).toBe(1000);
  });

  it('lets Quartermaster search for a Soldier and add it to its controller’s hand', () => {
    const h = fixture({ priority: 0, placements: [
      { seat: 0, card: 'P-011R', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
    ] });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-011R')!;
    const discard = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const cast = applyCommand(state, { id: 'quartermaster-cast', expectedSeq: state.seq, seat: 0, intent: {
      kind: 'cast', source: source.object, targets: [], mode: null, payment: {
        discard: [discard.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [discard.object]: 'Fire' }, spend: { Fire: 2 },
      },
    } }, context);
    expect(cast.ok).toBe(true);
    if (!cast.ok) return;
    state = cast.state;
    for (const seat of [1, 0] as const) {
      const passed = applyCommand(state, { id: `pass-${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      if (!passed.ok) throw new Error(passed.error.message);
      state = passed.state;
    }
    const choice = state.choice!;
    const target = choice.options.find(option => option.label === 'Ash Recruit')!;
    const targetInstance = Object.values(state.cards).find(card => card.object === target.id)!.instance;
    const answered = applyCommand(state, { id: 'quartermaster-search', expectedSeq: state.seq, seat: 0, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: [target.id], amounts: {} },
    } }, context);
    expect(answered.ok).toBe(true);
    if (answered.ok) expect(answered.state.cards[targetInstance]!.zone).toBe('hand');
  });

  it('dulls and freezes the chosen Forward when Frost Binder enters', () => {
    const h = fixture({ active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-025R', zone: 'hand' }, { seat: 1, card: 'P-023C', zone: 'hand' },
      { seat: 1, card: 'P-024C', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'field' },
    ] });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-025R')!;
    const first = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    const second = Object.values(state.cards).find(card => card.card === 'P-024C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const cast = applyCommand(state, { id: 'binder-cast', expectedSeq: state.seq, seat: 1, intent: {
      kind: 'cast', source: source.object, targets: [], mode: null, payment: {
        discard: [first.object, second.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [first.object]: 'Water', [second.object]: 'Water' }, spend: { Water: 3 },
      },
    } }, context);
    expect(cast.ok).toBe(true);
    if (!cast.ok) return;
    state = cast.state;
    for (const seat of [0, 1] as const) {
      const passed = applyCommand(state, { id: `pass-${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      if (!passed.ok) throw new Error(passed.error.message);
      state = passed.state;
    }
    const choice = state.choice!;
    const answered = applyCommand(state, { id: 'binder-target', expectedSeq: state.seq, seat: 1, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: [target.object], amounts: {} },
    } }, context);
    expect(answered.ok).toBe(true);
    if (answered.ok) {
      expect(answered.state.cards[target.instance]!.dull).toBe(true);
      expect(answered.state.cards[target.instance]!.frozen).toBe(true);
    }
  });

  it('lets Recovery Clerk put any card from its owner’s Break Zone on the deck bottom', () => {
    const h = fixture({ active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-032R', zone: 'field' }, { seat: 1, card: 'P-029C', zone: 'field' },
      { seat: 1, card: 'P-036R', zone: 'break' },
    ] });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-032R')!;
    const backup = Object.values(state.cards).find(card => card.card === 'P-029C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-036R')!;
    const activated = applyCommand(state, { id: 'clerk-activate', expectedSeq: state.seq, seat: 1, intent: {
      kind: 'activate', source: source.object, ability: 'recovery-clerk-action', targets: [target.object], payment: {
        discard: [], dullBackups: [backup.object], specialDiscard: null, dullSource: true, sacrificeSource: false,
        sourceElements: { [backup.object]: 'Water' }, spend: { Water: 1 },
      },
    } }, context);
    if (!activated.ok) throw new Error(`${activated.error.code}: ${activated.error.message}`);
    state = activated.state;
    for (const seat of [0, 1] as const) {
      const passed = applyCommand(state, { id: `pass-${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      if (!passed.ok) throw new Error(passed.error.message);
      state = passed.state;
    }
    expect(state.cards[target.instance]!.zone).toBe('deck');
    expect(state.zones[1].deck.at(-1)).toBe(target.instance);
  });

  it('triggers Mist Caller at End Phase and activates the selected Forward', () => {
    const h = fixture({ phase: 'main2', active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-034R', zone: 'field' }, { seat: 1, card: 'P-023C', zone: 'field', dull: true },
    ] });
    let state = h.state;
    const target = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    for (const seat of [1, 0] as const) {
      const passed = applyCommand(state, { id: `pass-${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      if (!passed.ok) throw new Error(passed.error.message);
      state = passed.state;
    }
    expect(state.phase).toBe('end');
    expect(state.stack).toHaveLength(1);
    for (const seat of [1, 0] as const) {
      const passed = applyCommand(state, { id: `pass-${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      if (!passed.ok) throw new Error(passed.error.message);
      state = passed.state;
    }
    const choice = state.choice!;
    const answered = applyCommand(state, { id: 'mist-target', expectedSeq: state.seq, seat: 1, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: [target.object], amounts: {} },
    } }, context);
    expect(answered.ok).toBe(true);
    if (answered.ok) expect(answered.state.cards[target.instance]!.dull).toBe(false);
  });

  it('lets Ember Medic return a Forward from Break Zone after sacrificing itself', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-013R', zone: 'field' }, { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-003C', zone: 'break' },
    ] });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-013R')!;
    const backup = Object.values(state.cards).find(card => card.card === 'P-009C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const activated = applyCommand(state, { id: 'medic-special', expectedSeq: state.seq, seat: 0, intent: {
      kind: 'activate', source: source.object, ability: 'ember-medic-special', targets: [target.object], payment: {
        discard: [], dullBackups: [backup.object], specialDiscard: null, dullSource: true, sacrificeSource: true,
        sourceElements: { [backup.object]: 'Fire' }, spend: { Fire: 1 },
      },
    } }, context);
    if (!activated.ok) throw new Error(`${activated.error.code}: ${activated.error.message}`);
    state = activated.state;
    expect(state.cards[source.instance]!.zone).toBe('break');
    for (const seat of [1, 0] as const) {
      const passed = applyCommand(state, { id: `pass-${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      if (!passed.ok) throw new Error(passed.error.message);
      state = passed.state;
    }
    expect(state.cards[target.instance]!.zone).toBe('hand');
  });

  it('triggers Tide Warden when the Commander enters and activates a chosen Forward', () => {
    const h = fixture({ active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-022C', zone: 'hand' }, { seat: 1, card: 'P-024C', zone: 'hand' },
      { seat: 1, card: 'P-023C', zone: 'field', dull: true },
    ] });
    let state = h.state;
    const commander = state.cards[state.commanders[1].instance]!;
    const first = Object.values(state.cards).find(card => card.card === 'P-022C')!;
    const second = Object.values(state.cards).find(card => card.card === 'P-024C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    const cast = applyCommand(state, { id: 'tide-commander-cast', expectedSeq: state.seq, seat: 1, intent: {
      kind: 'cast', source: commander.object, targets: [], mode: null, payment: {
        discard: [first.object, second.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [first.object]: 'Water', [second.object]: 'Water' }, spend: { Water: 3 },
      },
    } }, context);
    if (!cast.ok) throw new Error(cast.error.message);
    state = cast.state;
    for (const seat of [0, 1] as const) {
      const passed = applyCommand(state, { id: `pass-${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      if (!passed.ok) throw new Error(passed.error.message);
      state = passed.state;
    }
    const choice = state.choice!;
    const answered = applyCommand(state, { id: 'tide-entry-target', expectedSeq: state.seq, seat: 1, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: [target.object], amounts: {} },
    } }, context);
    expect(answered.ok).toBe(true);
    if (answered.ok) expect(answered.state.cards[target.instance]!.dull).toBe(false);
  });

  it('Archive Keeper draws one and makes its controller discard one on entry', () => {
    const h = fixture({ active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-031R', zone: 'hand' }, { seat: 1, card: 'P-022C', zone: 'hand' },
    ], deckTop: { 1: ['P-024C'] } });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-031R')!;
    const paymentCard = Object.values(state.cards).find(card => card.card === 'P-022C')!;
    const cast = applyCommand(state, { id: 'archive-cast', expectedSeq: state.seq, seat: 1, intent: {
      kind: 'cast', source: source.object, targets: [], mode: null, payment: {
        discard: [paymentCard.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [paymentCard.object]: 'Water' }, spend: { Water: 2 },
      },
    } }, context);
    if (!cast.ok) throw new Error(cast.error.message);
    state = cast.state;
    for (const seat of [0, 1] as const) {
      const passed = applyCommand(state, { id: `pass-${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      if (!passed.ok) throw new Error(passed.error.message);
      state = passed.state;
    }
    const drawn = Object.values(state.cards).find(card => card.card === 'P-024C')!;
    expect(drawn.zone).toBe('hand');
    expect(state.choice?.seat).toBe(1);
    const toDiscard = state.cards[state.zones[1].hand[0]!]!;
    const answered = applyCommand(state, { id: 'archive-discard', expectedSeq: state.seq, seat: 1, intent: {
      kind: 'answer', answer: { choice: state.choice!.id, selected: [toDiscard.object], amounts: {} },
    } }, context);
    expect(answered.ok).toBe(true);
    if (answered.ok) expect(answered.state.cards[toDiscard.instance]!.zone).toBe('break');
  });

  it('triggers Cinder Witness after a Forward it controls enters the Break Zone', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-014R', zone: 'field' }, { seat: 0, card: 'P-003C', zone: 'field' },
      { seat: 0, card: 'P-004C', zone: 'field' },
    ] });
    const state = h.state;
    const leaving = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-004C')!;
    requestDeparture(state, leaving.instance, 'break', context);
    expect(state.cards[leaving.instance]!.zone).toBe('break');
    expect(state.stack).toHaveLength(1);
    let current = state;
    for (const seat of [1, 0] as const) {
      const passed = applyCommand(current, { id: `pass-${current.seq}`, expectedSeq: current.seq, seat, intent: { kind: 'pass' } }, context);
      if (!passed.ok) throw new Error(passed.error.message);
      current = passed.state;
    }
    const choice = current.choice!;
    const answered = applyCommand(current, { id: 'witness-target', expectedSeq: current.seq, seat: 0, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: [target.object], amounts: {} },
    } }, context);
    expect(answered.ok).toBe(true);
    if (answered.ok) expect(answered.state.cards[target.instance]!.damage).toBe(1000);
  });

  it('uses the Witness card declaration to ignore Forward returns to hand', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-014R', zone: 'field' }, { seat: 0, card: 'P-003C', zone: 'field' },
    ] });
    const leaving = Object.values(h.state.cards).find(card => card.card === 'P-003C')!;
    requestDeparture(h.state, leaving.instance, 'hand', context);
    expect(h.state.cards[leaving.instance]!.zone).toBe('hand');
    expect(h.state.stack).toHaveLength(0);
  });

  it('uses Night Regent’s last known power when it leaves for the Break Zone', () => {
    const h = fixture({ placements: [
      { seat: 1, card: 'P-027H', zone: 'field' }, { seat: 1, card: 'P-024C', zone: 'field' },
    ] });
    const state = h.state;
    const regent = Object.values(state.cards).find(card => card.card === 'P-027H')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-024C')!;
    requestDeparture(state, regent.instance, 'break', context);
    let current = state;
    for (const seat of [0, 1] as const) {
      const passed = applyCommand(current, { id: `pass-${current.seq}`, expectedSeq: current.seq, seat, intent: { kind: 'pass' } }, context);
      if (!passed.ok) throw new Error(passed.error.message);
      current = passed.state;
    }
    const choice = current.choice!;
    const answered = applyCommand(current, { id: 'regent-target', expectedSeq: current.seq, seat: 1, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: [target.object], amounts: {} },
    } }, context);
    expect(answered.ok).toBe(true);
    if (answered.ok) expect(effectivePower(answered.state, target.object, context)).toBe(0);
  });

  it('offers Tide Witness an optional draw when its Forward leaves the field', () => {
    const h = fixture({ placements: [
      { seat: 1, card: 'P-033R', zone: 'field' }, { seat: 1, card: 'P-023C', zone: 'field' },
    ], deckTop: { 1: ['P-024C'] } });
    const state = h.state;
    const leaving = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    requestDeparture(state, leaving.instance, 'hand', context);
    let current = state;
    for (const seat of [0, 1] as const) {
      const passed = applyCommand(current, { id: `pass-${current.seq}`, expectedSeq: current.seq, seat, intent: { kind: 'pass' } }, context);
      if (!passed.ok) throw new Error(passed.error.message);
      current = passed.state;
    }
    const choice = current.choice!;
    expect(choice.reason).toContain('may draw');
    const answered = applyCommand(current, { id: 'tide-witness-draw', expectedSeq: current.seq, seat: 1, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: ['draw'], amounts: {} },
    } }, context);
    expect(answered.ok).toBe(true);
    if (answered.ok) expect(answered.state.cards[Object.values(answered.state.cards).find(card => card.card === 'P-024C')!.instance]!.zone).toBe('hand');
  });
});
