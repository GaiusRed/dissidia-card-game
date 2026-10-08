import type { CardDefinition } from '../../rules/types';
import { z } from 'zod';
import type { AbilityScript, CardScript, TriggerSubscription } from '../../rules/contracts/card-script';
import type { Operation, ResolutionContext, ResumeRef } from '../../rules/contracts/execution';

export function vanillaScript(metadata: CardDefinition): CardScript {
  if (metadata.abilities.length > 0 || metadata.type === 'Summon' || metadata.ex) {
    throw new Error(`${metadata.number} has behavior and cannot use the vanilla script helper.`);
  }
  return { metadata, behaviorVersion: '1', abilities: [] };
}

export function singleActivationScript(metadata: CardDefinition, run: (context: ResolutionContext) => import('../../rules/contracts/execution').OperationBatch[]): CardScript {
  const printed = metadata.abilities.length === 1 ? metadata.abilities[0] : undefined;
  if (!printed?.activation) {
    throw new Error(`${metadata.number} must define one activated ability.`);
  }
  const activation = printed.activation;
  const ability: AbilityScript = {
    id: printed.id, kind: printed.kind, text: printed.text, ex: printed.ex, zones: ['field'],
    cost: { cp: activation.cost, elements: activation.elements, dullSource: activation.dullSource,
      sacrificeSource: activation.sacrificeSource, sameNameDiscard: activation.specialDiscardName !== null },
    modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
    triggers: [], fieldEffects: [], replacements: [],
    steps: { resolve: { payloadSchema: z.null(), run: context => ({ batches: run(context), choice: null, next: null }) } },
  };
  return { metadata, behaviorVersion: '1', abilities: [ability] };
}

export function optionalForwardExAbility(metadata: CardDefinition, id: string,
  effect: (source: string, target: string) => Operation): AbilityScript {
  const resume = (step: string): ResumeRef => ({ script: metadata.number, version: '1', ability: id, step, payload: null });
  const forwardOptions = (context: ResolutionContext) => context.state.field.map(instance => context.state.cards[instance]!)
    .filter(target => context.catalog[target.card]?.type === 'Forward')
    .map(target => ({ id: target.object, label: context.catalog[target.card]!.name, object: target.object }));
  return {
    id, kind: 'auto', text: metadata.text, ex: true, zones: ['damage'],
    cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
    modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
    triggers: [], fieldEffects: [], replacements: [],
    steps: {
      resolve: { payloadSchema: z.null(), run: ({ frame }) => ({ batches: [], choice: {
        seat: frame.controller, kind: 'confirm', reason: `${metadata.name} EX Burst: use this effect?`,
        options: [{ id: 'use', label: 'Use effect', object: null }, { id: 'skip', label: 'Skip', object: null }],
        min: 1, max: 1, allocation: null, resume: resume('decide'),
      }, next: null }) },
      decide: { payloadSchema: z.null(), run: context => {
        if (context.answer?.selected[0] !== 'use') return { batches: [], choice: null, next: null };
        const options = forwardOptions(context);
        if (options.length === 0) return { batches: [], choice: null, next: null };
        return { batches: [], choice: { seat: context.frame.controller, kind: 'targets',
          reason: `${metadata.name} EX Burst: choose 1 Forward.`, options, min: 1, max: 1, allocation: null,
          resume: resume('apply') }, next: null };
      } },
      apply: { payloadSchema: z.null(), run: context => {
        const target = context.answer?.selected[0];
        if (!target || !forwardOptions(context).some(option => option.object === target)) return { batches: [], choice: null, next: null };
        return { batches: [{ simultaneous: false, operations: [effect(context.frame.source, target)] }], choice: null, next: null };
      } },
    },
  };
}

export const selfEntryTrigger: TriggerSubscription = {
  events: ['character.cast'],
  matches: (_state, event, source) => {
    if (!event.data || typeof event.data !== 'object' || Array.isArray(event.data)) return false;
    const data = event.data as Readonly<Record<string, unknown>>;
    return data.card === source.card && data.source === source.object && data.seat === source.controller;
  },
};

export function controlledForwardLeavesTrigger(destination?: 'break'): TriggerSubscription {
  return {
    events: ['card.moved'],
    matches: (_state, event, source) => {
      if (!event.data || typeof event.data !== 'object' || Array.isArray(event.data)) return false;
      const data = event.data as Readonly<Record<string, unknown>>;
      return data.type === 'Forward' && data.from === 'field' && data.controller === source.controller &&
        (destination === undefined || data.to === destination);
    },
  };
}

export const ownEndPhaseTrigger: TriggerSubscription = {
  events: ['phase.started'],
  matches: (_state, event, source) => {
    if (!event.data || typeof event.data !== 'object' || Array.isArray(event.data)) return false;
    const data = event.data as Readonly<Record<string, unknown>>;
    return data.phase === 'end' && data.active === source.controller;
  },
};

export const selfBreakTrigger: TriggerSubscription = {
  events: ['card.moved'],
  matches: (_state, event, source) => {
    if (!event.data || typeof event.data !== 'object' || Array.isArray(event.data)) return false;
    const data = event.data as Readonly<Record<string, unknown>>;
    return data.card === source.card && data.object === source.object && data.type === 'Forward' &&
      data.from === 'field' && data.to === 'break' && data.controller === source.controller;
  },
};
