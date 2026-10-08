import { describe, expect, it } from 'vitest';
import { eventMotionMarkers } from '../../src/client/table/animation';
import type { RuleEvent } from '../../src/rules/types';

describe('accepted event motion', () => {
  it('maps draw, cast, target, damage, departure, and Commander return events to stable markers', () => {
    const events: RuleEvent[] = [
      { id: 'draw-1', type: 'card.drawn', data: { seat: 0, card: 'P-003C' } },
      { id: 'cast-1', type: 'character.cast', data: { source: 'object-ash', seat: 0 } },
      { id: 'target-1', type: 'trigger.target-declared', data: { target: 'object-target' } },
      { id: 'damage-1', type: 'forward.damaged', data: { source: 'object-ash', target: 'object-target', amount: 3000 } },
      { id: 'depart-1', type: 'card.moved', data: { object: 'object-target', from: 'field', to: 'break' } },
      { id: 'return-1', type: 'commander.departed', data: { oldObject: 'object-commander', instance: 'instance-commander', destination: 'commander' } },
      { id: 'priority-1', type: 'priority.passed', data: { seat: 0 } },
    ];

    expect(eventMotionMarkers(events)).toEqual([
      { eventId: 'draw-1', kind: 'draw', seat: 0 },
      { eventId: 'cast-1', kind: 'cast', object: 'object-ash' },
      { eventId: 'target-1', kind: 'target', object: 'object-target' },
      { eventId: 'damage-1', kind: 'damage', object: 'object-target' },
      { eventId: 'depart-1', kind: 'departure', object: 'object-target' },
      { eventId: 'return-1', kind: 'commander-return', object: 'object-commander', instance: 'instance-commander' },
    ]);
  });
});
