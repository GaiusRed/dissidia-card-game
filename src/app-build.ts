/** Build identity persisted with each match and embedded in its offline shell. */
declare const __DISSIDIA_BUILD_ID__: string;
export const CLIENT_BUILD_ID = typeof __DISSIDIA_BUILD_ID__ === 'undefined' ? 'test-build' : __DISSIDIA_BUILD_ID__;
