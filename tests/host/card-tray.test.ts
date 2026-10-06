import { describe, expect, it } from 'vitest';
import { projectView } from '../../src/host/views';
import { context, fixture } from '../support/harness';

describe('playable card tray projection', () => {
  it('keeps the Commander visible beside the hand with current cost and source zone', () => {
    const h = fixture({ commanderCasts: { 0: 2 } });
    const view = projectView(h.state, 0, [], context);
    const commander = view.cardTray.otherZones.find(item => item.card.card === 'P-001L')!;
    expect(commander.sourceZone).toBe('commander');
    expect(commander.cast?.displayedCost).toBe(7);
    expect(commander.cast?.commanderTax).toBe(4);
    expect(commander.cast?.canDeclare).toBe(false);
    expect(view.cardTray.hand).toHaveLength(h.state.zones[0].hand.length);
    expect(view.cardTray.hand.every(item => item.sourceZone === 'hand')).toBe(true);
    expect(h.state.zones[0].hand).not.toContain(h.state.commanders[0].instance);
  });

  it('removes a Commander from the extension when it is in another rules zone', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-001L', zone: 'field' }] });
    const view = projectView(h.state, 0, [], context);
    expect(view.cardTray.otherZones).toEqual([]);
    expect(view.cards[h.state.commanders[0].instance]?.zone).toBe('field');
  });

  it('does not include an opponent hand card in the current seat tray', () => {
    const h = fixture({ placements: [{ seat: 1, card: 'P-035C', zone: 'hand' }] });
    const view = projectView(h.state, 0, [], context);
    expect(view.cardTray.hand.some(item => item.card.card === 'P-035C')).toBe(false);
    expect(JSON.stringify(view.cardTray)).not.toContain('P-035C');
  });
});
