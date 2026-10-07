import type { Catalog } from './types';

/** Produce a stable identity for the exact catalog used by a match. */
export function catalogVersion(catalog: Catalog): string {
  const canonical = Object.keys(catalog).sort().map(number => `${number}:${JSON.stringify(catalog[number])}`).join('|');
  let hash = 0x811c9dc5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `catalog-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
