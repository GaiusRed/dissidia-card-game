import { describe, expect, it } from 'vitest';
import type { CardScript } from '../../src/rules/contracts/card-script';
import { buildContent } from '../../src/content/manifest';
import { opusPhSet } from '../../src/content/sets/opus-ph';

function asSet(script: CardScript, id: string) {
  return { ...script, metadata: { ...script.metadata, set: id } };
}

describe('set manifests', () => {
  it('builds a combined catalog from scripts in two explicit sets', () => {
    const first = asSet(opusPhSet.scripts.find(script => script.metadata.number === 'P-003C')!, 'test-a');
    const second = asSet(opusPhSet.scripts.find(script => script.metadata.number === 'P-004C')!, 'test-b');
    const content = buildContent([
      { id: 'test-a', version: '1', scripts: [first], sources: [] },
      { id: 'test-b', version: '1', scripts: [second], sources: [] },
    ], 'combined-test');

    expect(Object.keys(content.catalog).sort()).toEqual(['P-003C', 'P-004C']);
    expect(content.registry?.manifest.cards.map(card => card.number).sort()).toEqual(['P-003C', 'P-004C']);
  });

  it('rejects set mismatches and duplicate card numbers across sets', () => {
    const script = opusPhSet.scripts.find(item => item.metadata.number === 'P-003C')!;
    expect(() => buildContent([{ id: 'wrong-set', version: '1', scripts: [script], sources: [] }], 'wrong'))
      .toThrow('does not match manifest');

    const first = asSet(script, 'test-a');
    const duplicate = asSet(script, 'test-b');
    expect(() => buildContent([
      { id: 'test-a', version: '1', scripts: [first], sources: [] },
      { id: 'test-b', version: '1', scripts: [duplicate], sources: [] },
    ], 'duplicate-test')).toThrow('Duplicate card number P-003C');
  });
});
