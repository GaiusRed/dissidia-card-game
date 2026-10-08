import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createSave, inspectSave } from '../../src/storage/save';
import { LocalHost } from '../../src/host/local-host';
import { context, fixture } from '../support/harness';

async function submit(host: LocalHost, id: string, seat: 0 | 1, intent: import('../../src/rules/types').Intent) {
  const state = host.getState();
  const reply = await host.submit({ id, expectedSeq: state.seq, seat, intent });
  if (!reply.ok) throw new Error(reply.error.message);
  return reply.state;
}

async function assertRecoversWithoutMutation(source: LocalHost): Promise<void> {
  await source.waitForSave();
  const serialized = await source.exportSave();
  const candidate = JSON.parse(serialized) as unknown;
  const candidateBefore = JSON.stringify(candidate);
  const liveBefore = JSON.stringify(source.getState());
  const destination = new LocalHost();
  expect(await destination.importSave(serialized)).toEqual({ imported: true, reason: null });
  expect(JSON.stringify(candidate)).toBe(candidateBefore);
  expect(JSON.stringify(source.getState())).toBe(liveBefore);
  expect(destination.getState()).toEqual(source.getState());
}

describe('semantic save envelope', () => {
  it('accepts an unchanged instance manifest without mutating the candidate', () => {
    const save = createSave(fixture({}).state, []);
    const before = JSON.stringify(save);
    expect(inspectSave(save, save.versions)).toEqual({ compatible: true, reason: null });
    expect(JSON.stringify(save)).toBe(before);
  });

  it('rejects a card identity changed in both state snapshots', () => {
    const save = createSave(fixture({}).state, []);
    const commander = save.origin.cards[save.origin.commanders[0].instance]!;
    const original = new Set(Object.values(save.origin.cards).filter(card => card.owner === 0).map(card => card.card));
    const replacement = Object.keys(context.catalog).find(number => !original.has(number) &&
      (context.catalog[number]!.elements.some(element => element === 'Light' || element === 'Dark') ||
        context.catalog[number]!.elements.some(element => context.catalog[commander.card]!.elements.includes(element))));
    expect(replacement).toBeDefined();
    const instance = save.origin.zones[0].deck[0]!;
    for (const snapshot of [save.origin, save.state]) snapshot.cards[instance]!.card = replacement!;
    expect(inspectSave(save, save.versions)).toMatchObject({ compatible: false });
  });

  it('rejects duplicate manifest entries and preserves the input', () => {
    const save = createSave(fixture({}).state, []);
    save.manifest.push({ ...save.manifest[0]! });
    const before = JSON.stringify(save);
    expect(inspectSave(save, save.versions)).toMatchObject({ compatible: false });
    expect(JSON.stringify(save)).toBe(before);
  });

  it('recovers real host saves at setup, trigger-order, and combat-allocation choices', async () => {
    const setup = new LocalHost();
    setup.start(71);
    await assertRecoversWithoutMutation(setup); // Starting-player choice.
    let state = setup.getState();
    state = await submit(setup, 'recover-starting-player', state.choice!.seat,
      { kind: 'answer', answer: { choice: state.choice!.id, selected: ['first'], amounts: {} } });
    expect(state.choice?.kind).toBe('mulligan');
    await assertRecoversWithoutMutation(setup);
    state = await submit(setup, 'recover-mulligan-redraw', state.choice!.seat,
      { kind: 'answer', answer: { choice: state.choice!.id, selected: ['redraw'], amounts: {} } });
    expect(state.choice?.kind).toBe('order');
    await assertRecoversWithoutMutation(setup);

    const triggerOrder = new LocalHost();
    triggerOrder.startScenario('end-trigger-order');
    state = triggerOrder.getState();
    state = await submit(triggerOrder, 'recover-end-pass-a', state.priority!, { kind: 'pass' });
    state = await submit(triggerOrder, 'recover-end-pass-b', state.priority!, { kind: 'pass' });
    expect(state.choice?.kind).toBe('targets');
    await assertRecoversWithoutMutation(triggerOrder);
    state = await submit(triggerOrder, 'recover-trigger-target', state.choice!.seat,
      { kind: 'answer', answer: { choice: state.choice!.id,
        selected: [state.choice!.options[0]!.id], amounts: {} } });
    expect(state.choice).toBeNull();
    await assertRecoversWithoutMutation(triggerOrder);

    const combat = new LocalHost();
    combat.startScenario('party-first-strike');
    state = combat.getState();
    const attackers = state.field.map(instance => state.cards[instance]!).filter(card =>
      card.controller === 1 && (card.card === 'P-023C' || card.card === 'P-024C'));
    state = await submit(combat, 'recover-party-attack', 1,
      { kind: 'attack', members: attackers.map(card => card.object) });
    state = await submit(combat, 'recover-attack-pass-a', state.priority!, { kind: 'pass' });
    state = await submit(combat, 'recover-attack-pass-b', state.priority!, { kind: 'pass' });
    const blocker = state.field.map(instance => state.cards[instance]!).find(card => card.card === 'P-003C')!;
    state = await submit(combat, 'recover-party-block', 0, { kind: 'block', blocker: blocker.object });
    state = await submit(combat, 'recover-block-pass-a', state.priority!, { kind: 'pass' });
    state = await submit(combat, 'recover-block-pass-b', state.priority!, { kind: 'pass' });
    expect(state.choice?.kind).toBe('allocation');
    await assertRecoversWithoutMutation(combat);
  });

  it('recovers a resolving Summon and a Commander replacement choice inside its batch', async () => {
    const host = new LocalHost();
    host.startScenario('commander-destinations');
    let state = host.getState();
    const summon = state.zones[1].hand.map(instance => state.cards[instance]!).find(card => card.card === 'P-035C')!;
    const payment = state.zones[1].hand.map(instance => state.cards[instance]!).find(card => card.card === 'P-024C')!;
    const commander = state.cards[state.commanders[0].instance]!;
    state = await submit(host, 'recover-summon-cast', 1, { kind: 'cast', source: summon.object,
      targets: [commander.object], mode: null, payment: { discard: [payment.object], dullBackups: [],
        specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [payment.object]: 'Water' }, spend: { Water: 2 } } });
    expect(state.stack).toHaveLength(1);
    await assertRecoversWithoutMutation(host);
    for (let pass = 0; pass < 2 && !state.choice; pass += 1) {
      state = await submit(host, `recover-summon-pass-${pass}`, state.priority!, { kind: 'pass' });
    }
    expect(state.choice?.reason).toContain('Commander');
    await assertRecoversWithoutMutation(host);
  });

  it('recovers a persisted delayed effect after its source Summon resolves', async () => {
    const host = new LocalHost();
    host.startScenario('end-trigger-order');
    let state = host.getState();
    const summon = state.zones[1].hand.map(instance => state.cards[instance]!).find(card => card.card === 'P-040R')!;
    const discard = state.zones[1].hand.map(instance => state.cards[instance]!).find(card => card.card === 'P-022C')!;
    state = await submit(host, 'recover-delayed-cast', 1, { kind: 'cast', source: summon.object,
      targets: [], mode: null, payment: { discard: [discard.object], dullBackups: [], specialDiscard: null,
        dullSource: false, sacrificeSource: false, sourceElements: { [discard.object]: 'Water' }, spend: { Water: 2 } } });
    for (let pass = 0; pass < 2 && state.stack.length; pass += 1) {
      state = await submit(host, `recover-delayed-resolve-${pass}`, state.priority!, { kind: 'pass' });
    }
    expect(state.execution.delayed).toHaveLength(1);
    await assertRecoversWithoutMutation(host);

    for (let step = 0; step < 100; step += 1) {
      state = host.getState();
      if (state.choice?.reason.includes('Rising Undertow: discard 1 card')) break;
      if (state.choice) {
        const selected = state.choice.kind === 'order'
          ? state.choice.options.map(option => option.id)
          : [state.choice.options[0]!.id];
        state = await submit(host, `recover-delayed-answer-${step}`, state.choice.seat,
          { kind: 'answer', answer: { choice: state.choice.id, selected, amounts: {} } });
      } else if (state.priority !== null) {
        state = await submit(host, `recover-delayed-pass-${step}`, state.priority, { kind: 'pass' });
      } else {
        throw new Error('The delayed-effect transcript reached an actorless state.');
      }
    }
    expect(state.choice?.kind).toBe('cards');
    expect(state.choice?.reason).toContain('Rising Undertow: discard 1 card');
    await assertRecoversWithoutMutation(host);
  });

  it('recovers at declaration, blocker, and normal-damage combat stages', async () => {
    const host = new LocalHost();
    host.startScenario('party-first-strike');
    let state = host.getState();
    const attacker = state.field.map(instance => state.cards[instance]!).find(card => card.card === 'P-026R')!;
    const blocker = state.field.map(instance => state.cards[instance]!).find(card => card.card === 'P-003C')!;
    state = await submit(host, 'recover-stage-attack', 1, { kind: 'attack', members: [attacker.object] });
    expect(state.combat?.step).toBe('prepare');
    await assertRecoversWithoutMutation(host);
    state = await submit(host, 'recover-stage-attack-pass-a', state.priority!, { kind: 'pass' });
    state = await submit(host, 'recover-stage-attack-pass-b', state.priority!, { kind: 'pass' });
    expect(state.combat?.step).toBe('block');
    await assertRecoversWithoutMutation(host);
    state = await submit(host, 'recover-stage-block', 0, { kind: 'block', blocker: blocker.object });
    state = await submit(host, 'recover-stage-block-pass-a', state.priority!, { kind: 'pass' });
    state = await submit(host, 'recover-stage-block-pass-b', state.priority!, { kind: 'pass' });
    expect(state.combat?.step).toBe('normalDamage');
    await assertRecoversWithoutMutation(host);
  });
});
