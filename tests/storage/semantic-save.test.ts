import { describe, expect, it } from 'vitest';
import { createSave, inspectSave } from '../../src/storage/save';
import { context, fixture } from '../support/harness';

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
});
