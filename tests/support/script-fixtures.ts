import { z } from 'zod';
import type { CardScript } from '../../src/rules/contracts/card-script';
import type { CardDefinition } from '../../src/rules/types';
import { opusPh } from '../../src/content/manifest';

export function syntheticCantripScript(): CardScript {
  const summon = opusPh['P-015C']!;
  const metadata: CardDefinition = {
    ...summon, number: 'TEST-001', name: 'Synthetic Cantrip', cost: 0, ex: false,
    text: 'Draw one card.',
    summonTarget: { min: 0, max: 0, zones: ['field'], types: ['Forward'], controller: 'any', dull: null },
    abilities: [],
  };
  return {
    metadata,
    behaviorVersion: '1',
    abilities: [{
      id: 'synthetic-cantrip', kind: 'summon', text: metadata.text, ex: false, zones: ['hand'],
      cost: { cp: 0, elements: ['Fire'], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
      modes: [], targets: { min: 0, max: 0 },
      fieldEffects: [], replacements: [],
      steps: { resolve: { payloadSchema: z.null(), run: ({ frame }) => ({ batches: [{ simultaneous: false, operations: [
        { kind: 'draw', seat: frame.controller, count: 1 },
      ] }], choice: null, next: null }) } },
    }],
  };
}
