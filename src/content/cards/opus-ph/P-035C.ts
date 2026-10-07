import { requestDeparture } from '../../../rules/commander';
import type { AbilityHandler, CardDefinition, Json } from '../../../rules/types';
import { returnForwardSummon } from '../../shared/summon-effects';
import { emit } from '../../shared/legacy';
import { z } from 'zod';
import type { CardScript } from '../../../rules/contracts/card-script';
import type { ResolutionContext } from '../../../rules/contracts/execution';
import { optionalForwardExAbility } from '../../shared/script-helpers';

const returnTideExBurst: AbilityHandler = context => {
  const data = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
    ? context.frame.data as Record<string, Json> : {};
  const seat = data.seat === 1 ? 1 : 0;
  if (context.frame.step === 'decision') {
    const selected = Array.isArray(data.selected) ? data.selected[0] : undefined;
    if (selected !== 'use') return { events: [emit(context.state, 'ex-burst.skipped', { seat, source: data.source ?? '' })], next: [], choice: null };
    const forwards = context.state.field.map(instance => context.state.cards[instance]!).filter(card => context.catalog[card.card]?.type === 'Forward');
    if (forwards.length === 0) return { events: [], next: [], choice: null };
    return { events: [], next: [], choice: { id: `choice-${context.state.nextId++}`, seat, kind: 'targets',
      reason: 'Return Tide EX Burst: choose a Forward.', options: forwards.map(card => ({ id: card.object, label: context.catalog[card.card]!.name, object: card.object })),
      min: 1, max: 1, allocation: null, resume: { handler: context.frame.handler, step: 'target', data: { seat, selected: [] } } } };
  }
  const selected = Array.isArray(data.selected) ? data.selected[0] : undefined;
  const target = typeof selected === 'string' ? Object.values(context.state.cards).find(card => card.object === selected) : undefined;
  if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward') return { events: [], next: [], choice: null };
  const receipt = requestDeparture(context.state, target.instance, 'hand', context);
  return { events: receipt ? [emit(context.state, 'forward.returned', { object: receipt.old.object, card: receipt.old.card, owner: receipt.old.owner })] : [], next: [], choice: context.state.choice };
};
export const abilityHandlers = { 'return-tide': returnForwardSummon, 'return-tide-ex-burst': returnTideExBurst };

export const card: CardDefinition = {
  "number": "P-035C",
  "name": "Return Tide",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "C",
  "type": "Summon",
  "elements": [
    "Water"
  ],
  "cost": 2,
  "power": null,
  "jobs": [],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [],
  "summonHandler": "return-tide",
  "summonTarget": { "min": 1, "max": 1, "zones": ["field"], "types": ["Forward"], "controller": "any", "dull": null },
  "exHandler": "return-tide-ex-burst",
  "ex": true,
  "text": "EX Burst. Choose 1 Forward. Return it to its owner's hand."
};
const returnAbility = (id: string, ex: boolean) => ({
  id, kind: ex ? 'auto' as const : 'summon' as const, text: card.text, ex, zones: ex ? ['damage' as const] : ['hand' as const],
  cost: { cp: ex ? 0 : card.cost, elements: ex ? [] : card.elements, dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
  triggers: [], fieldEffects: [], replacements: [],
  steps: { resolve: { payloadSchema: z.null(), run: ({ frame }: ResolutionContext) => ({
    batches: [{ simultaneous: false, operations: [{ kind: 'move' as const, object: frame.targets[0]!, to: 'hand' as const, index: null }] }], choice: null, next: null,
  }) } },
});
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [
  returnAbility('return-tide', false),
  optionalForwardExAbility(card, 'return-tide-ex-burst', (_source, target) => ({ kind: 'move', object: target, to: 'hand', index: null })),
] };
export default card;
