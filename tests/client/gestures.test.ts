import { describe, expect, it } from 'vitest';
import { beginHandGesture, cancelHandGesture, endHandGesture, moveHandGesture } from '../../src/client/table/gestures';

describe('hand gestures', () => {
  it('waits for a measured threshold before classifying movement', () => {
    const pressed = beginHandGesture(1, 100, 200);
    expect(moveHandGesture(pressed, 108, 204)).toEqual(pressed);
  });

  it('classifies dominant horizontal movement as local reordering', () => {
    const gesture = moveHandGesture(beginHandGesture(1, 100, 200), 125, 205);
    expect(gesture.kind).toBe('reorder');
    expect(endHandGesture(gesture)).toBe('reorder');
  });

  it('classifies upward movement as a cast even when the destination is farther away horizontally', () => {
    const gesture = moveHandGesture(beginHandGesture(1, 100, 500), 480, 250);
    expect(gesture.kind).toBe('cast');
    expect(endHandGesture(gesture)).toBe('cast');
  });

  it('does not produce an action after cancellation or downward movement', () => {
    expect(endHandGesture(cancelHandGesture())).toBeNull();
    expect(endHandGesture(moveHandGesture(beginHandGesture(1, 100, 200), 100, 230))).toBeNull();
  });
});
