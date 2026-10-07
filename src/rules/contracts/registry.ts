import type { Catalog } from '../types';
import type { CardScript } from './card-script';
import type { ResumeRef, ResumeStep } from './execution';

export interface RegistryManifest {
  id: string;
  cards: readonly { number: string; contentVersion: string; behaviorVersion: string }[];
}
export interface CardRegistry {
  manifest: RegistryManifest;
  catalog: Catalog;
  card(number: string): CardScript;
  ability(number: string, ability: string): CardScript['abilities'][number];
  resume(ref: ResumeRef): ResumeStep;
}
