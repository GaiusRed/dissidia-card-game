import { setCacheNameDetails } from 'workbox-core';
import { matchPrecache, precache } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';

declare const __DISSIDIA_BUILD_ID__: string;
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
  }
}

const buildId = __DISSIDIA_BUILD_ID__;
const shellPrefix = 'dissidia-shell-';
const shellCacheName = `${shellPrefix}${buildId}`;
const databaseName = 'dissidia-playtest';

setCacheNameDetails({ prefix: 'dissidia', suffix: buildId });
const precacheEntries = self.__WB_MANIFEST;

function readActiveBuildPin(): Promise<string | null> {
  return new Promise(resolve => {
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(databaseName, 1); }
    catch { resolve(null); return; }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('match')) db.createObjectStore('match');
      if (!db.objectStoreNames.contains('decks')) db.createObjectStore('decks', { keyPath: 'id' });
    };
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      let transaction: IDBTransaction;
      try { transaction = db.transaction('match', 'readonly'); }
      catch { db.close(); resolve(null); return; }
      const read = transaction.objectStore('match').get('current');
      read.onerror = () => { db.close(); resolve(null); };
      read.onsuccess = () => {
        const save = read.result as { clientBuild?: unknown; state?: { result?: unknown } } | undefined;
        db.close();
        resolve(typeof save?.clientBuild === 'string' && save.clientBuild.length > 0 && save.state?.result === null
          ? save.clientBuild : null);
      };
    };
  });
}

async function shellResponse(request: Request, pinnedBuild: string): Promise<Response | undefined> {
  const cache = await caches.open(`${shellPrefix}${pinnedBuild}`);
  return await cache.match(request, { ignoreSearch: true }) ??
    (request.mode === 'navigate' ? await cache.match(new URL('index.html', self.registration.scope).href) : undefined);
}

// Workbox route matchers must be synchronous. Resolve the persisted build pin
// in the handler so every same-origin request can use its matching shell.
registerRoute(({ url }) => url.origin === self.location.origin, async ({ request }) => {
  const pinnedBuild = await readActiveBuildPin();
  if (pinnedBuild && pinnedBuild !== buildId) {
    const response = await shellResponse(request, pinnedBuild);
    if (response) return response;
  }
  return await shellResponse(request, buildId) ?? await matchPrecache(request) ?? fetch(request);
}, 'GET');

precache(precacheEntries);

self.addEventListener('install', event => {
  const urls = [...new Set(precacheEntries.map(entry => new URL(entry.url, self.registration.scope).href))];
  event.waitUntil(caches.open(shellCacheName).then(async cache => {
    await cache.addAll(urls);
    const index = await cache.match(new URL('index.html', self.registration.scope).href);
    if (index) await cache.put(self.registration.scope, index.clone());
  }));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'GET_BUILD_ID') event.ports[0]?.postMessage(buildId);
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const pinnedBuild = await readActiveBuildPin();
    const retained = new Set([buildId, ...(pinnedBuild ? [pinnedBuild] : [])]);
    const shellCaches = (await caches.keys()).filter(name => name.startsWith(shellPrefix));
    await Promise.all(shellCaches.filter(name => !retained.has(name.slice(shellPrefix.length))).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
