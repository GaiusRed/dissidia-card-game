import type { Catalog, CardDefinition } from '../rules/types';
import P001L from './cards/opus-ph/P-001L';
import P002C from './cards/opus-ph/P-002C';
import P003C from './cards/opus-ph/P-003C';
import P004C from './cards/opus-ph/P-004C';
import P005R from './cards/opus-ph/P-005R';
import P006R from './cards/opus-ph/P-006R';
import P007H from './cards/opus-ph/P-007H';
import P008H from './cards/opus-ph/P-008H';
import P009C from './cards/opus-ph/P-009C';
import P010C from './cards/opus-ph/P-010C';
import P011R from './cards/opus-ph/P-011R';
import P012H from './cards/opus-ph/P-012H';
import P013R from './cards/opus-ph/P-013R';
import P014R from './cards/opus-ph/P-014R';
import P015C from './cards/opus-ph/P-015C';
import P016R from './cards/opus-ph/P-016R';
import P017R from './cards/opus-ph/P-017R';
import P018R from './cards/opus-ph/P-018R';
import P019H from './cards/opus-ph/P-019H';
import P020H from './cards/opus-ph/P-020H';
import P021L from './cards/opus-ph/P-021L';
import P022C from './cards/opus-ph/P-022C';
import P023C from './cards/opus-ph/P-023C';
import P024C from './cards/opus-ph/P-024C';
import P025R from './cards/opus-ph/P-025R';
import P026R from './cards/opus-ph/P-026R';
import P027H from './cards/opus-ph/P-027H';
import P028H from './cards/opus-ph/P-028H';
import P029C from './cards/opus-ph/P-029C';
import P030C from './cards/opus-ph/P-030C';
import P031R from './cards/opus-ph/P-031R';
import P032R from './cards/opus-ph/P-032R';
import P033R from './cards/opus-ph/P-033R';
import P034R from './cards/opus-ph/P-034R';
import P035C from './cards/opus-ph/P-035C';
import P036R from './cards/opus-ph/P-036R';
import P037R from './cards/opus-ph/P-037R';
import P038R from './cards/opus-ph/P-038R';
import P039H from './cards/opus-ph/P-039H';
import P040R from './cards/opus-ph/P-040R';
import { abilityHandlers as P015Routines } from './cards/opus-ph/P-015C';
import { abilityHandlers as P016Routines } from './cards/opus-ph/P-016R';
import { abilityHandlers as P017Routines } from './cards/opus-ph/P-017R';
import { abilityHandlers as P018Routines } from './cards/opus-ph/P-018R';
import { abilityHandlers as P019Routines } from './cards/opus-ph/P-019H';
import { abilityHandlers as P020Routines } from './cards/opus-ph/P-020H';
import { abilityHandlers as P035Routines } from './cards/opus-ph/P-035C';
import { abilityHandlers as P036Routines } from './cards/opus-ph/P-036R';
import { abilityHandlers as P037Routines } from './cards/opus-ph/P-037R';
import { abilityHandlers as P038Routines } from './cards/opus-ph/P-038R';
import { abilityHandlers as P039Routines } from './cards/opus-ph/P-039H';
import { abilityHandlers as P040Routines } from './cards/opus-ph/P-040R';
import { abilityHandlers as P001Routines } from './cards/opus-ph/P-001L';
import { abilityHandlers as P007Routines } from './cards/opus-ph/P-007H';
import { abilityHandlers as P010Routines } from './cards/opus-ph/P-010C';
import { abilityHandlers as P011Routines } from './cards/opus-ph/P-011R';
import { abilityHandlers as P013Routines } from './cards/opus-ph/P-013R';
import { abilityHandlers as P014Routines } from './cards/opus-ph/P-014R';
import { abilityHandlers as P021Routines } from './cards/opus-ph/P-021L';
import { abilityHandlers as P025Routines } from './cards/opus-ph/P-025R';
import { abilityHandlers as P027Routines } from './cards/opus-ph/P-027H';
import { abilityHandlers as P030Routines } from './cards/opus-ph/P-030C';
import { abilityHandlers as P031Routines } from './cards/opus-ph/P-031R';
import { abilityHandlers as P032Routines } from './cards/opus-ph/P-032R';
import { abilityHandlers as P033Routines } from './cards/opus-ph/P-033R';
import { abilityHandlers as P034Routines } from './cards/opus-ph/P-034R';
import { runtimeEffects as P008Effects } from './cards/opus-ph/P-008H';
import { runtimeEffects as P012Effects } from './cards/opus-ph/P-012H';

export const opusPhCards: readonly CardDefinition[] = [
  P001L, P002C, P003C, P004C, P005R, P006R, P007H, P008H, P009C, P010C,
  P011R, P012H, P013R, P014R, P015C, P016R, P017R, P018R, P019H, P020H,
  P021L, P022C, P023C, P024C, P025R, P026R, P027H, P028H, P029C, P030C,
  P031R, P032R, P033R, P034R, P035C, P036R, P037R, P038R, P039H, P040R,
];
export const opusPhNumbers = opusPhCards.map(card => card.number);
export const opusPh: Catalog = Object.fromEntries(opusPhCards.map(card => [card.number, card]));
export const opusPhAbilityHandlers = {
  ...P001Routines, ...P007Routines, ...P010Routines, ...P011Routines, ...P013Routines, ...P014Routines,
  ...P021Routines, ...P025Routines, ...P027Routines, ...P030Routines, ...P031Routines, ...P032Routines,
  ...P033Routines, ...P034Routines,
  ...P015Routines, ...P016Routines, ...P017Routines, ...P018Routines, ...P019Routines, ...P020Routines,
  ...P035Routines, ...P036Routines, ...P037Routines, ...P038Routines, ...P039Routines, ...P040Routines,
};
export const opusPhRuntimeEffects = { ...P008Effects, ...P012Effects };
