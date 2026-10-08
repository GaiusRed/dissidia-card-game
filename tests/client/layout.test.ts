import { describe, expect, it } from 'vitest';
import { computeTableLayout, type Rect } from '../../src/client/table/layout';

function overlaps(left: Rect, right: Rect): boolean {
  return left.x < right.x + right.width && left.x + left.width > right.x &&
    left.y < right.y + right.height && left.y + left.height > right.y;
}

describe('shared desktop table layout', () => {
  it.each([[1280, 720], [1920, 1080]])('keeps reserved regions inside %i×%i and disjoint', (width, height) => {
    const layout = computeTableLayout(width, height);
    const topLevel = [layout.header, layout.opponent, layout.field, layout.current, layout.progress];
    for (const rect of [...topLevel, layout.choices, layout.hand, layout.stack, ...Object.values(layout.rows)]) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.width).toBeGreaterThanOrEqual(0);
      expect(rect.height).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width);
      expect(rect.y + rect.height).toBeLessThanOrEqual(height);
    }
    for (let first = 0; first < topLevel.length; first += 1) {
      for (let second = first + 1; second < topLevel.length; second += 1) {
        expect(overlaps(topLevel[first]!, topLevel[second]!)).toBe(false);
      }
    }
    expect(overlaps(layout.choices, layout.progress)).toBe(false);
    expect(layout.rows.opponentBackups.y).toBeLessThan(layout.rows.opponentForwards.y);
    expect(layout.rows.opponentForwards.y).toBeLessThan(layout.rows.yourForwards.y);
    expect(layout.rows.yourForwards.y).toBeLessThan(layout.rows.yourBackups.y);
    const battlefieldCards = Object.values(layout.rows);
    for (let first = 0; first < battlefieldCards.length; first += 1) {
      for (let second = first + 1; second < battlefieldCards.length; second += 1) {
        expect(overlaps(battlefieldCards[first]!, battlefieldCards[second]!)).toBe(false);
      }
    }
    expect(layout.stack.x).toBeGreaterThanOrEqual(Math.max(...battlefieldCards.map(rect => rect.x + rect.width)));
  });
});
