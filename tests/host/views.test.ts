import { describe, expect, it } from 'vitest';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { LocalHost } from '../../src/host/local-host';
import type { Command } from '../../src/rules/types';
import { projectView } from '../../src/host/views';
import { addKeyword, addPower, changeControl } from '../../src/rules/continuous';
import { moveCard } from '../../src/rules/zones';
import { context, fixture } from '../support/harness';
import { loadRecord } from '../../src/storage/indexed-db';
import type { RuleEvent } from '../../src/rules/types';
import 'fake-indexeddb/auto';

describe('local host projections', () => {
  it('projects effective field power for presentation instead of requiring client rule evaluation', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-010C', zone: 'field' }, { seat: 0, card: 'P-005R', zone: 'field' },
    ] });
    const source = h.object(0, 'P-010C');
    const target = h.object(0, 'P-005R');
    addPower(h.state, source, target, 1000, h.state.turn);

    const view = projectView(h.state, 0, [], context);

    expect(view.presentations[target]).toMatchObject({ object: target, power: 5000 });
  });

  it('projects stolen-card ownership, effective characteristics, and a departed stack source', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'field' },
      { seat: 0, card: 'P-014R', zone: 'field' },
    ] });
    const target = h.object(0, 'P-005R');
    const source = h.object(0, 'P-014R');
    const sourceCard = Object.values(h.state.cards).find(card => card.object === source)!;
    changeControl(h.state, source, target, 1, null);
    addPower(h.state, source, target, 1000, h.state.turn);
    addKeyword(h.state, source, target, 'Haste', h.state.turn);
    const departed = moveCard(h.state, sourceCard.instance, 'break');
    h.state.stack.push({ id: 'departed-trigger', controller: 0, source, lastKnown: departed,
      targets: [target], mode: null, data: null,
      resume: { script: 'P-014R', version: '1', ability: 'cinder-witness-leave', step: 'resolve', payload: null } });

    const view = projectView(h.state, 1, [], context);

    expect(view.presentations[target]).toMatchObject({ owner: 0, controller: 1, power: 5000, keywords: ['Haste'] });
    expect(view.stack[0]).toMatchObject({ source, lastKnown: { object: source, owner: 0, zone: 'field' }, targets: [target] });
    expect(view.stack[0]).toMatchObject({ id: 'departed-trigger', ability: 'cinder-witness-leave', controller: 0 });
    expect(view.stack[0]).not.toHaveProperty('resume');
    expect(view.stack[0]).not.toHaveProperty('data');
    expect(view.cards[sourceCard.instance]).toMatchObject({ object: sourceCard.object, owner: 0, zone: 'break' });
    expect(view.field).not.toContain(sourceCard.instance);
    expect(view.presentations).not.toHaveProperty(source);
  });

  it('starts the exact two-seat placeholder decks and preserves opponent hidden information', async () => {
    const host = new LocalHost();
    host.start(42, [cinderCompany, tidalAssembly]);
    const state = host.getState();
    expect(Object.keys(state.cards)).toHaveLength(40);
    expect(state.choice?.kind).toBe('starting-player');
    const projection = host.view(0);
    expect(projection.cards[state.zones[1].deck[0]!]).toBeUndefined();
    expect(projection.zones[0].deck).toEqual([]);
    expect(projection.deckCounts[0]).toBe(state.zones[0].deck.length);
    expect(state.cards[state.zones[1].deck[0]!]!.card).not.toBe('HIDDEN');
    const choice = state.choice!;
    const reply = await host.submit({ id: 'default-view-opener', expectedSeq: state.seq, seat: choice.seat,
      intent: { kind: 'answer', answer: { choice: choice.id, selected: ['first'], amounts: {} } } });
    expect(reply.ok).toBe(true);
    const current = host.getState();
    const actor = current.choice!.seat;
    const opponentHand = current.zones[actor === 0 ? 1 : 0].hand;
    const opponentIdentity = current.cards[opponentHand[0]!]!.card;
    expect(JSON.stringify(host.view())).not.toContain(opponentIdentity);
  });

  it('withholds hidden card identities, deck order, private choices, and private log details', () => {
    const h = fixture({ placements: [{ seat: 1, card: 'P-031R', zone: 'hand' }] });
    const secret = Object.values(h.state.cards).find(card => card.owner === 1 && card.card === 'P-031R')!;
    const opponentDeckOrder = [...h.state.zones[1].deck];
    h.state.choice = { id: 'private-choice', seat: 1, kind: 'cards', reason: 'Search P-031R from deck.',
      options: [{ id: secret.object, label: 'P-031R', object: secret.object }], min: 1, max: 1, allocation: null,
      resume: { script: 'rules', version: '5', ability: 'choice-trigger', step: 'target', payload: { item: 'stack-test' } } };
    const log: RuleEvent[] = [
      { id: 'draw-secret', type: 'card.drawn', data: { seat: 1, card: 'P-031R' } },
      { id: 'draw-own', type: 'card.drawn', data: { seat: 0, card: 'P-003C' } },
    ];
    const view = projectView(h.state, 0, log);
    const text = JSON.stringify(view);
    expect(text).not.toContain('P-031R');
    expect(text).not.toContain('"rng"');
    expect(text).not.toContain('"resume"');
    expect(text).not.toContain(opponentDeckOrder[0]!);
    expect(view.choice?.options).toEqual([]);
    expect(view.log.map(entry => entry.id)).toEqual(['draw-own']);
    expect(view.deckCounts[1]).toBe(opponentDeckOrder.length);
    const publicView = projectView(h.state, null, log, context);
    const publicText = JSON.stringify(publicView);
    expect(publicText).not.toContain(opponentDeckOrder[0]!);
    expect(publicText).not.toContain('P-031R');
    expect(publicText).not.toContain(secret.object);
    expect(publicView.zones[0].hand.every(instance => instance.startsWith('hidden-hand-0-'))).toBe(true);
    expect(publicView.zones[1].hand.every(instance => instance.startsWith('hidden-hand-1-'))).toBe(true);
    expect(publicView.choice?.options).toEqual([]);
    expect(publicView.cardTray).toEqual({ hand: [], otherZones: [] });
    expect(publicView.castAccess).toEqual([]);
    expect(publicView.actions).toEqual([]);
    expect(publicView.log).toEqual([]);
  });

  it('preserves public damage-zone order while omitting the main-deck order', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'hand' }, { seat: 0, card: 'P-009C', zone: 'hand' },
    ] });
    const first = Object.values(h.state.cards).find(card => card.card === 'P-005R')!;
    const second = Object.values(h.state.cards).find(card => card.card === 'P-009C')!;
    moveCard(h.state, first.instance, 'damage');
    moveCard(h.state, second.instance, 'damage');

    const view = projectView(h.state, 0, [], context);

    expect(view.zones[0].damage).toEqual([first.instance, second.instance]);
    expect(view.zones[0].deck).toEqual([]);
    expect(JSON.stringify(view)).not.toContain(h.state.zones[0].deck[0]!);
  });

  it('accepts only current-sequence commands and publishes accepted state changes after persistence', async () => {
    const host = new LocalHost();
    host.start(1);
    let notifications = 0;
    host.subscribe(() => notifications++);
    const state = host.getState();
    const choice = state.choice!;
    const reply = await host.submit({ id: 'start', expectedSeq: 0, seat: choice.seat, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: ['first'], amounts: {} },
    } });
    expect(reply.ok).toBe(true);
    expect(notifications).toBe(1);
    expect((await loadRecord())?.state).toEqual(host.getState());
    const stale = await host.submit({ id: 'stale', expectedSeq: 0, seat: choice.seat, intent: { kind: 'concede' } });
    expect(stale.ok).toBe(false);
    expect(notifications).toBe(1);
  });
  it('projects current-seat cast access and legal actions without exposing deck state', async () => {
    const host = new LocalHost();
    host.start(43);
    for (let step = 0; step < 4 && host.getState().choice; step++) {
      const state = host.getState();
      const choice = state.choice!;
      const selected = choice.kind === 'starting-player' ? 'first' : 'keep';
      await host.submit({ id: `project-setup-${step}`, expectedSeq: state.seq, seat: choice.seat, intent: {
        kind: 'answer', answer: { choice: choice.id, selected: [selected], amounts: {} },
      } });
    }
    const current = host.getState();
    const actor = current.priority;
    if (actor === null) throw new Error('Expected a priority actor.');
    const access = host.view(actor).castAccess;
    expect(access.every(item => item.source && item.blockedReasons)).toBe(true);
    expect(host.view(actor).actions.some(action => action.kind === 'pass')).toBe(true);
    const foreign = host.view(actor === 0 ? 1 : 0);
    expect(foreign.actions).toEqual([]);
    expect(JSON.stringify(foreign)).not.toContain(current.zones[actor].deck[0]!);
  });
  it('projects printed and effective hand and Commander card data', async () => {
    const host = new LocalHost();
    host.start(4312);
    const initial = host.getState();
    const opening = initial.choice!;
    await host.submit({ id: 'projection-starting-player', expectedSeq: initial.seq, seat: opening.seat,
      intent: { kind: 'answer', answer: { choice: opening.id, selected: ['first'], amounts: {} } } });
    const view = host.view();
    const hand = view.cardTray.hand[0]!.card as unknown as Record<string, unknown>;
    const commander = view.cardTray.otherZones[0]!.card as unknown as Record<string, unknown>;
    expect(hand).toMatchObject({ zone: 'hand', frozen: false, commander: false, commanderTax: 0 });
    expect(hand.printed).toMatchObject({ number: hand.card, name: expect.any(String), type: expect.any(String) });
    expect(hand).toHaveProperty('power');
    expect(hand).toHaveProperty('keywords');
    expect(commander).toMatchObject({ zone: 'commander', commander: true, commanderTax: 0 });
    expect(commander.printed).toMatchObject({ number: commander.card, rarity: 'L' });
  });
  it('allows inspecting the other hand during setup without changing the decision actor', async () => {
    const host = new LocalHost();
    host.start(4321);
    const initial = host.getState();
    const opening = initial.choice!;
    expect((await host.submit({ generation: host.view().generation, command: {
      id: 'inspect-setup-start', expectedSeq: initial.seq, seat: opening.seat,
      intent: { kind: 'answer', answer: { choice: opening.id, selected: ['first'], amounts: {} } },
    } })).ok).toBe(true);
    const state = host.getState();
    const choice = state.choice!;
    expect(choice.kind).toBe('mulligan');
    const inspected = host.view(choice.seat === 0 ? 1 : 0);
    expect(inspected.decisionSeat).toBe(choice.seat);
    expect(inspected.choice?.options).toEqual([]);
    expect(inspected.cardTray.hand.length).toBeGreaterThan(0);
    const reply = await host.submit({ generation: inspected.generation, command: {
      id: 'inspect-then-answer', expectedSeq: state.seq, seat: choice.seat,
      intent: { kind: 'answer', answer: { choice: choice.id, selected: ['keep'], amounts: {} } },
    } });
    expect(reply.ok).toBe(true);
    expect(host.getState().seq).toBe(state.seq + 1);
  });
  it('deduplicates identical command IDs and rejects conflicting reuse without changing state', async () => {
    const host = new LocalHost();
    host.start(8);
    const initial = host.getState();
    const choice = initial.choice!;
    const command = { id: 'idempotent-setup', expectedSeq: initial.seq, seat: choice.seat, intent: {
      kind: 'answer' as const, answer: { choice: choice.id, selected: ['first'], amounts: {} },
    } };
    const first = await host.submit(command);
    expect(first.ok).toBe(true);
    const afterFirst = JSON.stringify(host.getState());
    const duplicate = await host.submit(command);
    expect(duplicate).toEqual(first);
    expect(JSON.stringify(host.getState())).toBe(afterFirst);
    const conflict = await host.submit({ ...command, intent: { kind: 'concede' } });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.error.code).toBe('COMMAND_ID_REUSED');
    expect(JSON.stringify(host.getState())).toBe(afterFirst);
  });
  it('exports and restores a replay-verified saved match without accepting incompatible imports', async () => {
    const host = new LocalHost();
    host.start(9);
    const initial = host.getState();
    const choice = initial.choice!;
    const command: Command = { id: 'setup', expectedSeq: 0, seat: choice.seat, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: ['first'], amounts: {} },
    } };
    const accepted = await host.submit(command);
    const afterFirst = host.getState();
    const mulligan = afterFirst.choice!;
    const secondCommand: Command = { id: 'keep-opening-hand', expectedSeq: afterFirst.seq, seat: mulligan.seat, intent: {
      kind: 'answer', answer: { choice: mulligan.id, selected: ['keep'], amounts: {} },
    } };
    expect((await host.submit(secondCommand)).ok).toBe(true);
    expect(await host.submit(command)).toEqual(accepted);
    await host.waitForSave();
    const exported = await host.exportSave();
    const restored = new LocalHost();
    expect(await restored.importSave(exported)).toEqual({ imported: true, reason: null });
    expect(restored.getState()).toEqual(host.getState());
    expect(await restored.submit(command)).toEqual(accepted);
    const before = JSON.stringify(restored.getState());
    const rejected = await restored.importSave('{"format":"wrong"}');
    expect(rejected.imported).toBe(false);
    expect(JSON.stringify(restored.getState())).toBe(before);
  });
});
