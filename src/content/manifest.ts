import type { EngineContext } from '../rules/types';
import type { CardScript } from '../rules/contracts/card-script';
import { createRegistry } from './registry';
import { opusPhSet } from './sets/opus-ph';

export interface SetManifest {
  id: string;
  version: string;
  scripts: readonly CardScript[];
  sources: readonly { url: string; reviewedOn: string }[];
}

/** Build the catalog and behavior registry from each set's single script entry. */
export function buildContent(sets: readonly SetManifest[], id: string): EngineContext {
  const scripts = sets.flatMap(set => {
    if (set.scripts.some(script => script.metadata.set !== set.id)) {
      throw new Error(`Card metadata set does not match manifest ${set.id}.`);
    }
    return [...set.scripts];
  });
  const registry = createRegistry(scripts, id);
  return { catalog: registry.catalog, registry };
}

export const opusPhContent = buildContent([opusPhSet], opusPhSet.version);
export const opusPhRegistry = opusPhContent.registry!;
export const opusPh = opusPhContent.catalog;
export const opusPhCards = Object.values(opusPh);
export const opusPhNumbers = opusPhCards.map(card => card.number);
export const opusPhRegisteredScripts = opusPhSet.scripts;

// These are derived views for behavior-focused tests, not separate registries.
export const opusPhVanillaScripts = opusPhRegisteredScripts.filter(script => script.abilities.length === 0);
export const opusPhSummonScripts = opusPhRegisteredScripts.filter(script => script.metadata.type === 'Summon');
export const opusPhActionScripts = opusPhRegisteredScripts.filter(script => script.abilities.some(ability => ability.kind === 'action' || ability.kind === 'special'));
export const opusPhFieldScripts = opusPhRegisteredScripts.filter(script => script.abilities.some(ability => ability.kind === 'field'));
export const opusPhReplacementScripts = opusPhRegisteredScripts.filter(script => script.abilities.some(ability => ability.kind === 'replacement'));
export const opusPhEntryScripts = opusPhRegisteredScripts.filter(script => script.abilities.some(ability => ability.kind === 'auto'));
