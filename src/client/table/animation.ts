import type { RuleEvent, Seat } from '../../rules/types';

export type EventMotionKind = 'draw' | 'cast' | 'target' | 'damage' | 'departure' | 'commander-return';
export interface EventMotionMarker {
  eventId: string;
  kind: EventMotionKind;
  object?: string;
  instance?: string;
  seat?: Seat;
}

function record(data: RuleEvent['data']): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}
function text(value: unknown): string | undefined { return typeof value === 'string' ? value : undefined; }
function seat(value: unknown): Seat | undefined { return value === 0 || value === 1 ? value : undefined; }

/** Creates presentation-only markers from events returned by an accepted host command. */
export function eventMotionMarkers(events: readonly RuleEvent[]): EventMotionMarker[] {
  const markers: EventMotionMarker[] = [];
  for (const event of events) {
    const data = record(event.data);
    if (event.type === 'card.drawn') {
      const actor = seat(data.seat);
      if (actor !== undefined) markers.push({ eventId: event.id, kind: 'draw', seat: actor });
    } else if (event.type === 'character.cast' || event.type === 'summon.cast') {
      const object = text(data.source);
      if (object) markers.push({ eventId: event.id, kind: 'cast', object });
    } else if (event.type === 'trigger.target-declared') {
      const object = text(data.target);
      if (object) markers.push({ eventId: event.id, kind: 'target', object });
    } else if (event.type === 'forward.damaged') {
      const object = text(data.target);
      if (object) markers.push({ eventId: event.id, kind: 'damage', object });
    } else if (event.type === 'card.moved') {
      const object = text(data.object);
      if (object && data.from === 'field' && data.to !== 'field') markers.push({ eventId: event.id, kind: 'departure', object });
    } else if (event.type === 'commander.departed') {
      const object = text(data.oldObject);
      const instance = text(data.instance);
      if (object && instance) markers.push({ eventId: event.id,
        kind: data.destination === 'commander' ? 'commander-return' : 'departure', object, instance });
    }
  }
  return markers;
}

/** Applies markers after the accepted projection renders; no rule progression waits for CSS. */
export function applyEventMotion(root: ParentNode, markers: readonly EventMotionMarker[]): void {
  for (const marker of markers) {
    const nodes: HTMLElement[] = [];
    const eventNode = root.querySelector<HTMLElement>(`[data-rule-event="${CSS.escape(marker.eventId)}"]`);
    if (eventNode) nodes.push(eventNode);
    if (marker.object) {
      const card = root.querySelector<HTMLElement>(`[data-card="${CSS.escape(marker.object)}"]`);
      if (card) nodes.push(card);
    }
    if (marker.instance) {
      const commander = root.querySelector<HTMLElement>(`[data-table-instance="${CSS.escape(marker.instance)}"]`);
      if (commander) nodes.push(commander);
    }
    if (marker.kind === 'draw' && marker.seat !== undefined) {
      const hand = root.querySelector<HTMLElement>(`.hand-fan[data-seat="${marker.seat}"]`);
      if (hand) nodes.push(hand);
    }
    for (const node of nodes) node.dataset.eventMotion = marker.kind;
  }
}
