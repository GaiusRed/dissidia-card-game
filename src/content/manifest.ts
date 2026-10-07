import type { Catalog, CardDefinition } from '../rules/types';
import { createRegistry } from './registry';
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
import { script as P002Script } from './cards/opus-ph/P-002C';
import { script as P003Script } from './cards/opus-ph/P-003C';
import { script as P004Script } from './cards/opus-ph/P-004C';
import { script as P005Script } from './cards/opus-ph/P-005R';
import { script as P006Script } from './cards/opus-ph/P-006R';
import { script as P009Script } from './cards/opus-ph/P-009C';
import { script as P022Script } from './cards/opus-ph/P-022C';
import { script as P023Script } from './cards/opus-ph/P-023C';
import { script as P024Script } from './cards/opus-ph/P-024C';
import { script as P026Script } from './cards/opus-ph/P-026R';
import { script as P028Script } from './cards/opus-ph/P-028H';
import { script as P029Script } from './cards/opus-ph/P-029C';
import { script as P019Script } from './cards/opus-ph/P-019H';
import { script as P040Script } from './cards/opus-ph/P-040R';
import { script as P037Script } from './cards/opus-ph/P-037R';
import { script as P038Script } from './cards/opus-ph/P-038R';
import { script as P017Script } from './cards/opus-ph/P-017R';
import { script as P018Script } from './cards/opus-ph/P-018R';
import { script as P016Script } from './cards/opus-ph/P-016R';
import { script as P036Script } from './cards/opus-ph/P-036R';
import { script as P039Script } from './cards/opus-ph/P-039H';
import { script as P015Script } from './cards/opus-ph/P-015C';
import { script as P020Script } from './cards/opus-ph/P-020H';
import { script as P035Script } from './cards/opus-ph/P-035C';
import { script as P010Script } from './cards/opus-ph/P-010C';
import { script as P013Script } from './cards/opus-ph/P-013R';
import { script as P030Script } from './cards/opus-ph/P-030C';
import { script as P032Script } from './cards/opus-ph/P-032R';
import { script as P001Script } from './cards/opus-ph/P-001L';
import { script as P012Script } from './cards/opus-ph/P-012H';
import { script as P008Script } from './cards/opus-ph/P-008H';
import { script as P007Script } from './cards/opus-ph/P-007H';
import { script as P025Script } from './cards/opus-ph/P-025R';
import { script as P031Script } from './cards/opus-ph/P-031R';
import { script as P014Script } from './cards/opus-ph/P-014R';
import { script as P033Script } from './cards/opus-ph/P-033R';
import { script as P021Script } from './cards/opus-ph/P-021L';
import { script as P034Script } from './cards/opus-ph/P-034R';
import { script as P027Script } from './cards/opus-ph/P-027H';
import { script as P011Script } from './cards/opus-ph/P-011R';

export const opusPhCards: readonly CardDefinition[] = [
  P001L, P002C, P003C, P004C, P005R, P006R, P007H, P008H, P009C, P010C,
  P011R, P012H, P013R, P014R, P015C, P016R, P017R, P018R, P019H, P020H,
  P021L, P022C, P023C, P024C, P025R, P026R, P027H, P028H, P029C, P030C,
  P031R, P032R, P033R, P034R, P035C, P036R, P037R, P038R, P039H, P040R,
];
export const opusPhNumbers = opusPhCards.map(card => card.number);
export const opusPh: Catalog = Object.fromEntries(opusPhCards.map(card => [card.number, card]));
export const opusPhVanillaScripts = [
  P002Script, P003Script, P004Script, P005Script, P006Script, P009Script,
  P022Script, P023Script, P024Script, P026Script, P028Script, P029Script,
];
export const opusPhSummonScripts = [P015Script, P016Script, P017Script, P018Script, P019Script, P020Script,
  P035Script, P036Script, P037Script, P038Script, P039Script, P040Script];
export const opusPhActionScripts = [P001Script, P010Script, P013Script, P021Script, P030Script, P032Script];
export const opusPhFieldScripts = [P012Script];
export const opusPhReplacementScripts = [P008Script];
export const opusPhEntryScripts = [P007Script, P011Script, P014Script, P025Script, P027Script, P031Script, P033Script, P034Script];
export const opusPhRegisteredScripts = [
  ...opusPhVanillaScripts, ...opusPhSummonScripts, ...opusPhActionScripts,
  ...opusPhFieldScripts, ...opusPhReplacementScripts, ...opusPhEntryScripts,
];
export const opusPhRegistry = createRegistry(opusPhRegisteredScripts, 'opus-ph-v1');
