import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { LocalHost } from '../../src/host/local-host';
import { createSave, inspectSave, type MatchSave } from '../../src/storage/save';
import { loadRecord, saveRecord } from '../../src/storage/indexed-db';
import { context, fixture } from '../support/harness';

describe('save import errors', () => {
  it('returns a normal failure for JSON with a supported label but no version metadata', async () => {
    const host = new LocalHost();
    await expect(host.importSave(JSON.stringify({ format: 'dissidia-save-v1' }))).resolves.toMatchObject({
      imported: false,
      reason: expect.any(String),
    });
  });

  it('returns a normal failure for malformed JSON and null metadata', async () => {
    const host = new LocalHost();
    await expect(host.importSave('{')).resolves.toMatchObject({ imported: false });
    await expect(host.importSave('null')).resolves.toMatchObject({ imported: false });
  });

  it('rejects a supported save label when its nested match state is malformed', () => {
    const save = createSave(fixture({}).state, []);
    const malformed = { ...save, state: { seq: 0 } };
    expect(inspectSave(malformed, save.versions)).toMatchObject({ compatible: false, reason: expect.any(String) });
  });

  it('rejects a card deleted from both the saved origin and final state', async () => {
    const save = createSave(fixture({}).state, []);
    const instance = save.state.zones[0].deck[0]!;
    for (const state of [save.origin, save.state]) {
      state.zones[0].deck = state.zones[0].deck.filter(id => id !== instance);
      delete state.cards[instance];
    }
    const host = new LocalHost();
    expect(await host.importSave(JSON.stringify(save))).toMatchObject({ imported: false, reason: expect.any(String) });
  });

  it('rejects a different but legal deck when both saved snapshots are rewritten', async () => {
    const save = createSave(fixture({}).state, []);
    const commander = save.origin.cards[save.origin.commanders[0].instance]!;
    const originalNumbers = new Set(Object.values(save.origin.cards).filter(card => card.owner === 0).map(card => card.card));
    const commanderElements = context.catalog[commander.card]!.elements;
    const replacement = Object.keys(context.catalog).find(number => {
      const definition = context.catalog[number]!;
      return !originalNumbers.has(number) && (definition.elements.some(element => element === 'Light' || element === 'Dark') ||
        definition.elements.some(element => commanderElements.includes(element)));
    });
    expect(replacement).toBeDefined();
    const instance = save.origin.zones[0].deck[0]!;
    for (const state of [save.origin, save.state]) state.cards[instance]!.card = replacement!;
    const host = new LocalHost();
    expect(await host.importSave(JSON.stringify(save))).toMatchObject({ imported: false, reason: expect.any(String) });
  });

  it('rejects a rewritten card manifest before changing the stored match', async () => {
    const prior = createSave(fixture({}).state, []);
    await saveRecord(prior);
    const before = await loadRecord();
    const candidate = createSave(fixture({}).state, []);
    candidate.manifest.pop();
    const host = new LocalHost();
    expect(await host.importSave(JSON.stringify(candidate))).toMatchObject({ imported: false, reason: expect.any(String) });
    expect(await loadRecord()).toEqual(before);
  });

  it('rejects owner and Commander-role tampering before changing the stored match', async () => {
    const source = new LocalHost();
    source.start(901);
    await source.waitForSave();
    const base = JSON.parse(await source.exportSave()) as ReturnType<typeof createSave>;
    const prior = createSave(fixture({}).state, []);
    await saveRecord(prior);
    const before = await loadRecord();
    const commander = base.origin.commanders[0].instance;
    const nonCommander = base.origin.zones[0].deck[0]!;

    const ownerTamper = structuredClone(base);
    for (const state of [ownerTamper.origin, ownerTamper.state]) state.cards[nonCommander]!.owner = 1;

    const commanderTamper = structuredClone(base);
    for (const state of [commanderTamper.origin, commanderTamper.state]) state.commanders[0].instance = nonCommander;

    for (const candidate of [ownerTamper, commanderTamper]) {
      const host = new LocalHost();
      expect(await host.importSave(JSON.stringify(candidate))).toMatchObject({ imported: false, reason: expect.any(String) });
      expect(await loadRecord()).toEqual(before);
    }
  });

  it('rejects semantic tampering before any import writes to IndexedDB', async () => {
    const source = new LocalHost();
    source.start(902);
    await source.waitForSave();
    const base = JSON.parse(await source.exportSave()) as MatchSave;
    const prior = createSave(fixture({}).state, []);
    await saveRecord(prior);
    const before = await loadRecord();
    const firstCard = base.origin.zones[0].deck[0]!;
    const secondCard = base.origin.zones[0].deck[1]!;
    const tamperers: Array<[string, (save: MatchSave) => void]> = [
      ['delete a conserved instance', save => {
        for (const snapshot of [save.origin, save.state]) {
          snapshot.zones[0].deck = snapshot.zones[0].deck.filter(instance => instance !== firstCard);
          delete snapshot.cards[firstCard];
        }
      }],
      ['rewrite deck order', save => {
        for (const snapshot of [save.origin, save.state]) snapshot.zones[0].deck.reverse();
      }],
      ['rewrite the normal-origin seed', save => {
        if (save.originDescriptor.kind === 'normal') save.originDescriptor.seed += 1;
      }],
      ['rewrite a saved continuation handler and step', save => {
        for (const snapshot of [save.origin, save.state]) {
          if (!snapshot.choice) throw new Error('Expected the normal setup choice.');
          snapshot.choice.resume = { handler: 'unknown-setup', step: 'unknown-step', data: null };
        }
      }],
      ['rewrite an inner version pin', save => {
        for (const snapshot of [save.origin, save.state]) snapshot.versions.catalog = 'forged-catalog';
      }],
      ['rewrite frame payload and step', save => {
        for (const snapshot of [save.origin, save.state]) {
          const commander = snapshot.cards[snapshot.commanders[0].instance]!;
          snapshot.execution.frames.push({ id: 'tampered-frame', resume: {
            script: 'rules', version: '4', ability: 'missing', step: 'missing', payload: { forged: true },
          }, mode: 'rule', controller: 0, source: commander.object, lastKnown: { ...commander }, targets: [],
          selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: 0 }, operationIndex: 0, scriptComplete: false });
        }
      }],
      ['rewrite choice bounds and target identity', save => {
        for (const snapshot of [save.origin, save.state]) {
          snapshot.choice = { ...snapshot.choice!, kind: 'targets',
            options: [{ id: 'unknown-target', label: 'Missing target', object: 'unknown-target' }], min: 1, max: 2 };
        }
      }],
      ['rewrite combat references', save => {
        for (const snapshot of [save.origin, save.state]) snapshot.combat = { step: 'damage',
          participants: [{ ...snapshot.cards[snapshot.commanders[0].instance]! }], attackers: ['unknown-attacker'],
          blocker: null, wasBlocked: false, partyFirstStrike: false, allocation: { 'unknown-attacker': 1000 } };
      }],
    ];
    expect(firstCard).not.toBe(secondCard);

    for (const [label, tamper] of tamperers) {
      const candidate = structuredClone(base);
      tamper(candidate);
      const host = new LocalHost();
      expect(await host.importSave(JSON.stringify(candidate)), label).toMatchObject({ imported: false, reason: expect.any(String) });
      expect(await loadRecord(), `${label} must not replace the stored save`).toEqual(before);
    }
  });

  it('rejects an origin whose conserved deck violates Commander element legality', async () => {
    const save = createSave(fixture({}).state, []);
    const instance = save.state.zones[0].deck[0]!;
    for (const state of [save.origin, save.state]) state.cards[instance]!.card = 'P-029C';
    const host = new LocalHost();
    expect(await host.importSave(JSON.stringify(save))).toMatchObject({ imported: false, reason: expect.any(String) });
  });

  it('rejects a modified format profile even when both snapshots agree', async () => {
    const save = createSave(fixture({}).state, []);
    for (const state of [save.origin, save.state]) state.format.allowedSets.push('unregistered-set');
    const host = new LocalHost();
    expect(await host.importSave(JSON.stringify(save))).toMatchObject({ imported: false, reason: expect.any(String) });
  });

  it('rejects a replay-consistent save with no actor or required choice', async () => {
    const save = createSave(fixture({}).state, []);
    for (const state of [save.origin, save.state]) {
      state.priority = null;
      state.choice = null;
    }
    const host = new LocalHost();
    expect(await host.importSave(JSON.stringify(save))).toMatchObject({ imported: false, reason: expect.any(String) });
  });

  it('rejects replay-consistent choices whose bounds exceed their options', async () => {
    const state = fixture({}).state;
    state.priority = null;
    state.choice = { id: 'invalid-bounds', seat: 0, kind: 'confirm', reason: 'test',
      options: [{ id: 'only-option', label: 'Only option', object: null }], min: 0, max: 2, allocation: null,
      resume: { handler: 'setup', step: 'starting-player', data: null } };
    const save = createSave(state, []);
    for (const state of [save.origin, save.state]) {
      state.choice!.min = 0;
      state.choice!.max = 2;
    }
    const host = new LocalHost();
    expect(await host.importSave(JSON.stringify(save))).toMatchObject({ imported: false, reason: expect.any(String) });
  });

  it('rejects combat references and allocations that do not match known participants', async () => {
    const state = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-005R', zone: 'field' },
    ] }).state;
    state.combat = { step: 'damage', participants: [{ ...Object.values(state.cards).find(card => card.card === 'P-005R')! }],
      attackers: ['unknown-attacker'], blocker: null, wasBlocked: false,
      partyFirstStrike: false, allocation: { 'unknown-attacker': 1000 } };
    const save = createSave(state, []);
    const host = new LocalHost();
    expect(await host.importSave(JSON.stringify(save))).toMatchObject({ imported: false, reason: expect.any(String) });
  });

  it('rejects a typed choice without its active continuation frame', async () => {
    const state = fixture({}).state;
    state.priority = null;
    state.choice = { id: 'orphan-choice', seat: 0, kind: 'confirm', reason: 'test',
      options: [{ id: 'continue', label: 'Continue', object: null }], min: 1, max: 1, allocation: null,
      resume: { script: 'rules', version: '4', ability: 'setup', step: 'starting-player', payload: null } };
    const save = createSave(state, []);
    const host = new LocalHost();
    expect(await host.importSave(JSON.stringify(save))).toMatchObject({ imported: false, reason: expect.any(String) });
  });

  it('rejects an unknown typed continuation before accepting the save', async () => {
    const state = fixture({}).state;
    const commander = state.cards[state.commanders[0].instance]!;
    state.execution.frames.push({ id: 'unknown-frame', resume: {
      script: 'rules', version: '4', ability: 'missing-rule-script', step: 'resolve', payload: null,
    }, mode: 'rule', controller: 0, source: commander.object, lastKnown: { ...commander }, targets: [], selectedMode: null,
      remaining: [], returnWindow: { kind: 'priority', seat: 0 }, operationIndex: 0, scriptComplete: false });
    const save = createSave(state, []);
    const host = new LocalHost();
    expect(await host.importSave(JSON.stringify(save))).toMatchObject({ imported: false, reason: expect.any(String) });
  });

  it('rejects a saved choice that points to an unknown card object', async () => {
    const state = fixture({}).state;
    state.priority = null;
    state.choice = { id: 'unknown-target', seat: 0, kind: 'targets', reason: 'test',
      options: [{ id: 'missing-object', label: 'Missing card', object: 'missing-object' }], min: 1, max: 1, allocation: null,
      resume: { handler: 'trigger-declaration', step: 'target', data: null } };
    const save = createSave(state, []);
    const host = new LocalHost();
    expect(await host.importSave(JSON.stringify(save))).toMatchObject({ imported: false, reason: expect.any(String) });
  });

  it('preserves and exports an incompatible stored save after restore fails', async () => {
    const save = createSave(fixture({}).state, []);
    save.versions.engine = 'obsolete-engine';
    save.origin.versions.engine = 'obsolete-engine';
    save.state.versions.engine = 'obsolete-engine';
    await saveRecord(save);
    const before = await loadRecord();
    const host = new LocalHost();
    const restored = await host.restore();
    expect(restored).toMatchObject({ restored: false, reason: expect.stringContaining('engine version') });
    expect(await loadRecord()).toEqual(before);
    expect(JSON.parse((await host.exportStoredRecord())!)).toEqual(before);
  });
});
