import { describe, expect, it } from 'vitest';
import { describeCastAccess, legalActions } from '../../src/rules/actions';
import { applyCommand } from '../../src/rules/engine';
import { moveCard } from '../../src/rules/zones';
import { context, fixture } from '../support/harness';
import type { ActionOffer, CardDefinition, EngineContext, Intent, MatchState, Payment, Seat } from '../../src/rules/types';

describe('read-only action availability', () => {
  it('offers a hand card when timing, target, and complete CP are available', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-015C', zone: 'hand' },
      { seat: 1, card: 'P-023C', zone: 'field' },
    ] });
    const before = JSON.stringify(h.state);
    const access = describeCastAccess(h.state, 0, context);
    const scorch = access.find(item => item.source === h.object(0, 'P-015C'))!;
    expect(scorch.canDeclare).toBe(true);
    expect(scorch.displayedCost).toBe(1);
    expect(legalActions(h.state, 0, context).some(action => action.source === scorch.source)).toBe(true);
    expect(JSON.stringify(h.state)).toBe(before);
  });

  it('lists only CP sources accepted by the payment rules', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 1, card: 'P-030C', zone: 'field' },
      { seat: 0, card: 'P-005R', zone: 'field' }, { seat: 0, card: 'P-003C', zone: 'hand' }, { seat: 0, card: 'P-007H', zone: 'hand' },
      { seat: 0, card: 'P-015C', zone: 'hand' },
    ] });
    const offElement = h.state.cards[h.state.field.find(instance => h.state.cards[instance]!.card === 'P-030C')!]!;
    offElement.controller = 0;
    const source = h.object(0, 'P-015C');
    const offer = legalActions(h.state, 0, context).find(action => action.source === source)!;
    expect(offer.payment?.discardOptions).toEqual([h.object(0, 'P-003C')]);
    expect(offer.payment?.backupOptions).toEqual([h.object(0, 'P-009C')]);
    const accepted = applyCommand(h.state, { id: 'offer-legal-cp', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'cast', source, targets: [h.object(0, 'P-005R')], mode: null, payment: {
        discard: [], dullBackups: [h.object(0, 'P-009C')], specialDiscard: null,
        dullSource: false, sacrificeSource: false, sourceElements: { [h.object(0, 'P-009C')]: 'Fire' }, spend: { Fire: 1 },
      },
    } }, context);
    if (!accepted.ok) throw new Error(JSON.stringify(accepted.error));
    expect(accepted.ok).toBe(true);
  });

  it('does not offer a Summon during either restricted combat-damage window', () => {
    for (const step of ['firstStrike', 'normalDamage'] as const) {
      const h = fixture({ phase: 'attack', placements: [
        { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-015C', zone: 'hand' },
        { seat: 0, card: 'P-003C', zone: 'field' }, { seat: 1, card: 'P-023C', zone: 'field' },
      ] });
      const participant = Object.values(h.state.cards).find(card => card.object === h.object(1, 'P-023C'))!;
      h.state.combat = { step, participants: [{ ...participant }], attackers: [participant.object], blocker: null, wasBlocked: false,
        partyFirstStrike: false, allocation: {} };
      const source = h.object(0, 'P-015C');
      expect(describeCastAccess(h.state, 0, context).find(access => access.source === source)?.canDeclare).toBe(false);
      expect(legalActions(h.state, 0, context).some(action => action.source === source)).toBe(false);
    }
  });

  it('offers CP from an opponent-owned Backup under the payer control', () => {
    const h = fixture({ active: 1, priority: 1, placements: [
      { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 1, card: 'P-028H', zone: 'hand' },
    ] });
    const backup = Object.values(h.state.cards).find(card => card.owner === 0 && card.card === 'P-009C')!;
    backup.controller = 1;
    const source = h.object(1, 'P-028H');
    const modified: EngineContext = { ...context, catalog: { ...context.catalog,
      'P-028H': { ...context.catalog['P-028H']!, cost: 1 } } };
    expect(describeCastAccess(h.state, 1, modified).find(access => access.source === source)?.canDeclare).toBe(true);
    expect(legalActions(h.state, 1, modified).find(action => action.source === source)?.payment?.backupOptions)
      .toContain(backup.object);
    const accepted = applyCommand(h.state, { id: 'cast-with-borrowed-backup', expectedSeq: h.state.seq, seat: 1,
      intent: { kind: 'cast', source, targets: [], mode: null, payment: {
        discard: [], dullBackups: [backup.object], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [backup.object]: 'Fire' }, spend: { Fire: 1 },
      } } }, modified);
    expect(accepted.ok).toBe(true);
  });

  it('derives Summon target offers from card metadata instead of handler-name rules', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-015C', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'field' },
      { seat: 1, card: 'P-023C', zone: 'field' },
    ] });
    const modified: EngineContext = {
      ...context,
      catalog: {
        ...context.catalog,
        'P-015C': { ...context.catalog['P-015C']!, summonTarget: {
          min: 1, max: 1, zones: ['field'], types: ['Forward'],
          controller: 'you' as const, dull: null,
        } as NonNullable<CardDefinition['summonTarget']> },
      },
    };
    const offer = legalActions(h.state, 0, modified).find(action => action.source === h.object(0, 'P-015C'))!;
    expect(offer.targetOptions.map(target => target.id)).toEqual([h.object(0, 'P-003C')]);
    expect(offer.minTargets).toBe(1);
  });

  it('projects legal targets for each declared Summon mode', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-003C', zone: 'field' },
      { seat: 0, card: 'P-020H', zone: 'hand' },
      { seat: 1, card: 'P-023C', zone: 'field' },
    ] });
    const modified: EngineContext = { ...context, catalog: { ...context.catalog,
      'P-020H': { ...context.catalog['P-020H']!, cost: 0 } } };
    const offer = legalActions(h.state, 0, modified).find(action => action.source === h.object(0, 'P-020H'))!;
    expect(offer.modeTargetOptions?.backup?.map(target => target.object)).toEqual([h.object(0, 'P-009C')]);
    expect(offer.modeTargetOptions?.forward?.map(target => target.object)).toEqual([
      h.object(0, 'P-003C'), h.object(1, 'P-023C'),
    ]);
  });

  it('reports missing targets, insufficient CP, and timing as blocked reasons', () => {
    const h = fixture({ phase: 'end', placements: [
      { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-015C', zone: 'hand' },
      { seat: 0, card: 'P-019H', zone: 'hand' },
    ] });
    const access = describeCastAccess(h.state, 0, context);
    const scorch = access.find(item => item.source === h.object(0, 'P-015C'))!;
    const spark = access.find(item => item.source === h.object(0, 'P-019H'))!;
    expect(scorch.canDeclare).toBe(false);
    expect(scorch.blockedReasons.map(error => error.code)).toContain('NO_LEGAL_TARGET');
    expect(spark.blockedReasons.map(error => error.code)).toContain('INSUFFICIENT_CP');
    expect(spark.blockedReasons.map(error => error.code)).toContain('WRONG_TIMING');
  });

  it('includes Commander tax in displayed cost and offers no opponent actions', () => {
    const h = fixture({ commanderCasts: { 0: 2 }, placements: [
      { seat: 0, card: 'P-009C', zone: 'field' },
    ] });
    const commander = h.object(0, 'P-001L');
    const item = describeCastAccess(h.state, 0, context).find(access => access.source === commander)!;
    expect(item.displayedCost).toBe(7);
    expect(item.commanderTax).toBe(4);
    expect(legalActions(h.state, 1, context)).toEqual([]);
  });

  it('offers a Summon response to the player with priority during the opponent\'s attack', () => {
    const h = fixture({ phase: 'attack', active: 0, priority: 1, placements: [
      { seat: 1, card: 'P-029C', zone: 'field' },
      { seat: 1, card: 'P-023C', zone: 'hand' },
      { seat: 1, card: 'P-035C', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'field' },
    ] });
    const response = describeCastAccess(h.state, 1, context).find(item => item.source === h.object(1, 'P-035C'))!;
    expect(response.canDeclare).toBe(true);
    expect(legalActions(h.state, 1, context).some(action => action.source === response.source)).toBe(true);
  });

  it('offers an activated action only when its source and target are legal', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-010C', zone: 'field' },
      { seat: 0, card: 'P-003C', zone: 'field' },
    ] });
    const actions = legalActions(h.state, 0, context);
    const offer = actions.find(action => action.kind === 'activate' && action.source === h.object(0, 'P-010C'))!;
    expect(offer).toBeDefined();
    expect(offer.ability).toBe('forge-apprentice-action');
    expect(offer.targetOptions.map(target => target.id)).toContain(h.object(0, 'P-003C'));
    expect(offer.payment?.dullSource).toBe(true);
  });

  it('keeps unselected same-name cards available as CP beside a special discard', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-002C', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-005R', zone: 'field' },
    ] });
    h.state.priority = 0;
    const commander = h.state.cards[h.state.commanders[0].instance]!;
    moveCard(h.state, commander.instance, 'field');
    const copies = [...h.state.zones[0].hand].map(instance => h.state.cards[instance]!);
    const target = h.object(0, 'P-005R');
    const modified: EngineContext = { ...context, catalog: { ...context.catalog,
      'P-002C': { ...context.catalog['P-002C']!, name: 'Cinder Marshal' },
      'P-003C': { ...context.catalog['P-003C']!, name: 'Cinder Marshal' },
    } };
    const offer = legalActions(h.state, 0, modified).find(action => action.kind === 'activate' && action.source === commander.object)!;
    expect(offer.payment?.specialOptions).toEqual(copies.map(card => card.object));
    expect(offer.payment?.discardOptions).toEqual(copies.map(card => card.object));

    const selectedSpecial = copies[0]!;
    const selectedCp = copies[1]!;
    const accepted = applyCommand(h.state, { id: 'special-discard-plus-same-name-cp', expectedSeq: h.state.seq, seat: 0,
      intent: { kind: 'activate', source: commander.object, ability: offer.ability!, targets: [target], payment: {
        discard: [selectedCp.object], dullBackups: [], specialDiscard: selectedSpecial.object,
        dullSource: true, sacrificeSource: false, sourceElements: { [selectedCp.object]: 'Fire' }, spend: { Fire: 1 },
      } } }, modified);
    if (!accepted.ok) throw new Error(JSON.stringify(accepted.error));
    expect(accepted.ok).toBe(true);
  });

  it('hides activated offers when the source is dull or no legal target exists', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-010C', zone: 'field', dull: true }] });
    expect(legalActions(h.state, 0, context).some(action => action.kind === 'activate')).toBe(false);
  });

  it('offers only real blocker selections; passing priority declines to block', () => {
    const h = fixture({ phase: 'attack', active: 0, priority: 1, placements: [
      { seat: 0, card: 'P-003C', zone: 'field', controlledSinceTurn: 1 },
      { seat: 1, card: 'P-023C', zone: 'field', controlledSinceTurn: 1 },
    ] });
    const attacker = Object.values(h.state.cards).find(card => card.object === h.object(0, 'P-003C'))!;
    h.state.combat = { step: 'block', participants: [{ ...attacker }], attackers: [attacker.object], blocker: null, wasBlocked: false,
      partyFirstStrike: false, allocation: {} };
    const action = legalActions(h.state, 1, context).find(offer => offer.kind === 'block');
    expect(action?.minTargets).toBe(1);
    expect(action?.maxTargets).toBe(1);
    expect(action?.targetOptions.map(option => option.id)).toEqual([h.object(1, 'P-023C')]);
  });

  it('accepts one legal completion for every action offered in main and combat fixtures', () => {
    const main = fixture({ phase: 'main1', active: 0, priority: 0, placements: [
        { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-010C', zone: 'field' },
        { seat: 0, card: 'P-003C', zone: 'field' }, { seat: 1, card: 'P-023C', zone: 'field' },
        { seat: 0, card: 'P-015C', zone: 'hand' }, { seat: 0, card: 'P-020H', zone: 'hand' },
        { seat: 0, card: 'P-005R', zone: 'hand' }, { seat: 0, card: 'P-004C', zone: 'hand' },
      ] });
    const attacking = fixture({ phase: 'attack', active: 0, priority: 0, placements: [
        { seat: 0, card: 'P-003C', zone: 'field', controlledSinceTurn: 0 },
        { seat: 0, card: 'P-004C', zone: 'field', controlledSinceTurn: 0 },
      ] });
    const blocking = fixture({ phase: 'attack', active: 0, priority: 1, placements: [
        { seat: 0, card: 'P-003C', zone: 'field', controlledSinceTurn: 0 },
        { seat: 1, card: 'P-023C', zone: 'field', controlledSinceTurn: 0 },
      ] });
    const attacker = Object.values(blocking.state.cards).find(card => card.card === 'P-003C')!;
    blocking.state.combat = { step: 'block', participants: [{ ...attacker }], attackers: [attacker.object], blocker: null,
      wasBlocked: false, partyFirstStrike: false, allocation: {} };
    const fixtures = [main, attacking, blocking];
    const paymentFor = (state: MatchState, offer: ActionOffer): Payment => {
      const spec = offer.payment;
      if (!spec) return { discard: [], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: {}, spend: {} };
      const specialDiscard = spec.specialOptions[0] ?? null;
      const candidates = [
        ...spec.discardOptions.map(object => ({ object, kind: 'discard' as const })),
        ...spec.backupOptions.map(object => ({ object, kind: 'backup' as const })),
      ].filter(candidate => candidate.object !== specialDiscard);
      const selected: { object: string; kind: 'discard' | 'backup'; element: import('../../src/rules/types').Element }[] = [];
      let total = 0;
      for (const candidate of candidates) {
        if (total >= spec.cost) break;
        const card = Object.values(state.cards).find(item => item.object === candidate.object)!;
        const definition = context.catalog[card.card]!;
        const colorless = spec.elements.some(element => element === 'Light' || element === 'Dark');
        const element = definition.elements.find(item => (colorless || spec.elements.includes(item)) &&
          !(candidate.kind === 'discard' && (item === 'Light' || item === 'Dark')));
        if (!element) continue;
        selected.push({ ...candidate, element });
        total += candidate.kind === 'discard' ? 2 : 1;
      }
      if (total < spec.cost) throw new Error(`fixture does not fund action ${offer.id}`);
      let remaining = spec.cost;
      const spend: Payment['spend'] = {};
      for (const candidate of selected) {
        const amount = Math.min(remaining, candidate.kind === 'discard' ? 2 : 1);
        spend[candidate.element] = (spend[candidate.element] ?? 0) + amount;
        remaining -= amount;
      }
      return {
        discard: selected.filter(item => item.kind === 'discard').map(item => item.object),
        dullBackups: selected.filter(item => item.kind === 'backup').map(item => item.object),
        specialDiscard, dullSource: spec.dullSource, sacrificeSource: spec.sacrificeSource,
        sourceElements: Object.fromEntries(selected.map(item => [item.object, item.element])), spend,
      };
    };
    const intentFor = (state: MatchState, offer: ActionOffer): Intent => {
      if (offer.kind === 'pass') return { kind: 'pass' };
      if (offer.kind === 'cast' || offer.kind === 'activate') {
        const mode = offer.modes[0]?.id ?? null;
        const targets = (mode ? offer.modeTargetOptions?.[mode] ?? [] : offer.targetOptions)
          .slice(0, offer.minTargets).map(option => option.object ?? option.id);
        return offer.kind === 'cast'
          ? { kind: 'cast', source: offer.source!, targets, mode, payment: paymentFor(state, offer) }
          : { kind: 'activate', source: offer.source!, ability: offer.ability!, targets, payment: paymentFor(state, offer) };
      }
      if (offer.kind === 'attack') return { kind: 'attack', members: [offer.source!] };
      if (offer.kind === 'block') return { kind: 'block', blocker: offer.targetOptions[0]?.object ?? null };
      throw new Error(`unsupported fixture action ${offer.kind}`);
    };

    let offerCount = 0;
    const coveredKinds = new Set<string>();
    for (const [fixtureIndex, seed] of fixtures.entries()) {
      const offers = legalActions(seed.state, seed.state.priority as Seat, context);
      for (const [offerIndex, originalOffer] of offers.entries()) {
        const state = JSON.parse(JSON.stringify(seed.state)) as MatchState;
        const seat = state.priority as Seat;
        const offer = legalActions(state, seat, context).find(candidate => candidate.id === originalOffer.id)!;
        const accepted = applyCommand(state, { id: `offer-completion-${fixtureIndex}-${offerIndex}`,
          expectedSeq: state.seq, seat, intent: intentFor(state, offer) }, context);
        expect(accepted.ok, `${offer.id} should accept an offered legal completion`).toBe(true);
        offerCount += 1;
        coveredKinds.add(offer.kind);
      }
    }
    expect(offerCount).toBeGreaterThan(8);
    expect(coveredKinds).toEqual(new Set(['pass', 'cast', 'activate', 'attack', 'block']));
  });
});
