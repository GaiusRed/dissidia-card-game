import type { EngineContext } from '../rules/types';
import { opusPhRegistry } from './manifest';

export const productionContext: EngineContext = {
  catalog: opusPhRegistry.catalog,
  registry: opusPhRegistry,
};
