import type { AbilityHandler, CardDefinition, Json } from '../../../rules/types';
import { damageSummon } from '../../shared/summon-effects';
import { z } from 'zod';
import type { CardScript } from '../../../rules/contracts/card-script';
import type { ResolutionContext, StepResult } from '../../../rules/contracts/execution';
import { optionalForwardExAbility } from '../../shared/script-helpers';
import { damageForward } from '../../shared/card-helpers';
import { emit } from '../../shared/legacy';

const scorchExBurst: AbilityHandler = context => {
  const data = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
    ? context.frame.data as Record<string, Json> : {};
  const seat = data.seat === 1 ? 1 : 0;
  if (context.frame.step === 'decision') {
    const selected = Array.isArray(data.selected) ? data.selected[0] : undefined;
    if (selected !== 'use') return { events: [emit(context.state, 'ex-burst.skipped', { seat, source: data.source ?? '' })], next: [], choice: null };
    const forwards = context.state.field.map(instance => context.state.cards[instance]!).filter(card => context.catalog[card.card]?.type === 'Forward');
    if (forwards.length === 0) return { events: [], next: [], choice: null };
    return { events: [], next: [], choice: { id: `choice-${context.state.nextId++}`, seat, kind: 'targets',
      reason: 'Scorch EX Burst: choose a Forward.', options: forwards.map(card => ({ id: card.object, label: context.catalog[card.card]!.name, object: card.object })),
      min: 1, max: 1, allocation: null, resume: { handler: context.frame.handler, step: 'target', data: { seat, selected: [] } } } };
  }
  const selected = Array.isArray(data.selected) ? data.selected[0] : undefined;
  const target = typeof selected === 'string' ? Object.values(context.state.cards).find(card => card.object === selected) : undefined;
  if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward') return { events: [], next: [], choice: null };
  return { events: damageForward(context, target.object, 4000), next: [], choice: context.state.choice };
};
export const abilityHandlers = { scorch: damageSummon(4000), 'scorch-ex-burst': scorchExBurst };

export const card: CardDefinition = {
  "number": "P-015C",
  "name": "Scorch",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "C",
  "type": "Summon",
  "elements": [
    "Fire"
  ],
  "cost": 1,
  "power": null,
  "jobs": [],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [],
  "summonHandler": "scorch",
  "summonTarget": { "min": 1, "max": 1, "zones": ["field"], "types": ["Forward"], "controller": "any", "dull": null },
  "exHandler": "scorch-ex-burst",
  "ex": true,
  "text": "EX Burst. Choose 1 Forward. Deal it 4000 damage."
};
const summonAbility = (id: string, ex: boolean, kind: 'summon' | 'auto', run: (context: ResolutionContext) => StepResult['batches']) => ({
  id, kind, text: card.text, ex, zones: ex ? ['damage' as const] : ['hand' as const],
  cost: { cp: ex ? 0 : card.cost, elements: ex ? [] : card.elements, dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
  triggers: [], fieldEffects: [], replacements: [],
  steps: { resolve: { payloadSchema: z.null(), run: (context: ResolutionContext) => ({ batches: run(context), choice: null, next: null }) } },
});
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [
  summonAbility('scorch', false, 'summon', ({ frame }) => [{ simultaneous: false, operations: [{ kind: 'forward-damage', source: frame.source, target: frame.targets[0]!, amount: 4000 }] }]),
  optionalForwardExAbility(card, 'scorch-ex-burst', (source, target) => ({ kind: 'forward-damage', source, target, amount: 4000 })),
] };
export default card;
