export function nextRandom(seed: number): { value: number; seed: number } {
  const next = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
  return { seed: next, value: next / 0x100000000 };
}
export function shuffle<T>(items: readonly T[], seed: number): { items: T[]; seed: number } {
  const result = [...items];
  let current = seed >>> 0;
  for (let index = result.length - 1; index > 0; index -= 1) {
    const draw = nextRandom(current);
    current = draw.seed;
    const selected = Math.floor(draw.value * (index + 1));
    [result[index], result[selected]] = [result[selected]!, result[index]!];
  }
  return { items: result, seed: current };
}
