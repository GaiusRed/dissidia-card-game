import { describe, expect, it } from 'vitest';
import { describeCastAccess, legalActions } from '../../src/rules/actions';
import { context, fixture } from '../support/harness';

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

  it('derives Summon target offers from card metadata instead of handler-name rules', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-015C', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'field' },
      { seat: 1, card: 'P-023C', zone: 'field' },
    ] });
    const modified = {
      ...context,
      catalog: {
        ...context.catalog,
        'P-015C': { ...context.catalog['P-015C']!, summonTarget: {
          min: 1, max: 1, zones: ['field'] as const, types: ['Forward'] as const,
          controller: 'you' as const, dull: null,
        } },
      },
    };
    const offer = legalActions(h.state, 0, modified).find(action => action.source === h.object(0, 'P-015C'))!;
    expect(offer.targetOptions.map(target => target.id)).toEqual([h.object(0, 'P-003C')]);
    expect(offer.minTargets).toBe(1);
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

  it('hides activated offers when the source is dull or no legal target exists', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-010C', zone: 'field', dull: true }] });
    expect(legalActions(h.state, 0, context).some(action => action.kind === 'activate')).toBe(false);
  });

  it('offers only real blocker selections; passing priority declines to block', () => {
    const h = fixture({ phase: 'attack', active: 0, priority: 1, placements: [
      { seat: 0, card: 'P-003C', zone: 'field', controlledSinceTurn: 1 },
      { seat: 1, card: 'P-023C', zone: 'field', controlledSinceTurn: 1 },
    ] });
    h.state.combat = { step: 'block', attackers: [h.object(0, 'P-003C')], blocker: null, wasBlocked: false, allocation: {} };
    const action = legalActions(h.state, 1, context).find(offer => offer.kind === 'block');
    expect(action?.minTargets).toBe(1);
    expect(action?.maxTargets).toBe(1);
    expect(action?.targetOptions.map(option => option.id)).toEqual([h.object(1, 'P-023C')]);
  });
});
