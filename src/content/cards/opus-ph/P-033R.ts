import type { AbilityHandler, CardDefinition, Json, Seat } from '../../../rules/types';
import { moveCard } from '../../../rules/zones';
import { emit } from '../../shared/legacy';
import type { CardScript } from '../../../rules/contracts/card-script';
import type { ResolutionContext, ResumeRef } from '../../../rules/contracts/execution';
import { z } from 'zod';
import { controlledForwardLeavesTrigger } from '../../shared/script-helpers';

const tideWitnessDraw: AbilityHandler = context => {
  const data = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
    ? context.frame.data as Record<string, Json> : {};
  const seat: Seat = data.seat === 1 ? 1 : 0;
  if (context.frame.step === 'choice') {
    const selected = Array.isArray(data.selected) ? data.selected[0] : undefined;
    if (selected !== 'draw') return { events: [emit(context.state, 'trigger.declined', { seat, ability: 'tide-witness-draw' })], next: [], choice: null };
    const instance = context.state.zones[seat].deck[0];
    if (!instance) {
      context.state.work.push({ handler: 'rule-process', step: 'empty-deck', data: { seat } });
      return { events: [emit(context.state, 'player.attempted-empty-draw', { seat, source: 'Tide Witness' })], next: [], choice: null };
    }
    const old = moveCard(context.state, instance, 'hand');
    return { events: [emit(context.state, 'card.drawn', { seat, card: old.card, source: 'Tide Witness' })], next: [], choice: null };
  }
  return { events: [], next: [], choice: {
    id: `choice-${context.state.nextId++}`, seat, kind: 'confirm',
    reason: 'Tide Witness: you may draw 1 card.',
    options: [{ id: 'draw', label: 'Draw 1 card', object: null }, { id: 'skip', label: 'Do not draw', object: null }],
    min: 1, max: 1, allocation: null,
    resume: { handler: context.frame.handler, step: 'choice', data: { seat, selected: [] } },
  } };
};
export const abilityHandlers = { 'tide-witness-draw': tideWitnessDraw };

export const card: CardDefinition = {
  "number": "P-033R",
  "name": "Tide Witness",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Backup",
  "elements": [
    "Water"
  ],
  "cost": 2,
  "power": null,
  "jobs": [
    "Support"
  ],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [
    {
      "id": "tide-witness-leave",
      "kind": "auto",
      "handler": "tide-witness-draw",
      "text": "When a Forward you control leaves the field, you may draw 1 card.",
      "ex": false,
      "trigger": "controlled-forward-leaves"
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "When a Forward you control leaves the field, you may draw 1 card."
};
const tideWitnessResume: ResumeRef = { script: 'P-033R', version: '1', ability: 'tide-witness-leave', step: 'decision', payload: null };
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [{
  id: 'tide-witness-leave', kind: 'auto', text: card.abilities[0]!.text, ex: false, zones: ['field'],
  cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 0, max: 0, distinct: true, accepts: () => true },
  triggers: [controlledForwardLeavesTrigger()], fieldEffects: [], replacements: [],
  steps: {
    resolve: { payloadSchema: z.null(), run: ({ frame }) => ({ batches: [], choice: { seat: frame.controller,
      kind: 'confirm', reason: 'Tide Witness: you may draw 1 card.',
      options: [{ id: 'draw', label: 'Draw 1 card', object: null }, { id: 'skip', label: 'Do not draw', object: null }],
      min: 1, max: 1, allocation: null, resume: tideWitnessResume }, next: null }) },
    decision: { payloadSchema: z.null(), run: (context: ResolutionContext) => context.answer?.selected[0] !== 'draw'
      ? { batches: [], choice: null, next: null }
      : { batches: [{ simultaneous: false, operations: [{ kind: 'draw', seat: context.frame.controller, count: 1 }] }],
        choice: null, next: null } },
  },
}] };
export default card;
