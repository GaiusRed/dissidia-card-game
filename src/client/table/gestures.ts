export type HandGesture =
  | { kind: 'pressed'; pointerId: number; startX: number; startY: number }
  | { kind: 'reorder'; pointerId: number; startX: number; startY: number }
  | { kind: 'cast'; pointerId: number; startX: number; startY: number }
  | { kind: 'idle' };

export function beginHandGesture(pointerId: number, x: number, y: number): HandGesture {
  return { kind: 'pressed', pointerId, startX: x, startY: y };
}

export function moveHandGesture(gesture: HandGesture, x: number, y: number, threshold = 12): HandGesture {
  if (gesture.kind !== 'pressed') return gesture;
  const dx = x - gesture.startX;
  const dy = y - gesture.startY;
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return gesture;
  if (dy <= -threshold) return { ...gesture, kind: 'cast' };
  if (Math.abs(dx) > Math.abs(dy)) return { ...gesture, kind: 'reorder' };
  return gesture;
}

export function endHandGesture(gesture: HandGesture): 'reorder' | 'cast' | null {
  return gesture.kind === 'reorder' || gesture.kind === 'cast' ? gesture.kind : null;
}

export function cancelHandGesture(): HandGesture {
  return { kind: 'idle' };
}
