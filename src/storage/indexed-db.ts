import type { MatchSave } from './save';

const databaseName = 'dissidia-playtest';
let database: Promise<IDBDatabase> | null = null;
function openDatabase(): Promise<IDBDatabase> {
  if (database) return database;
  database = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('match')) db.createObjectStore('match');
      if (!db.objectStoreNames.contains('decks')) db.createObjectStore('decks', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local match storage.'));
  });
  return database;
}
export async function saveRecord(record: MatchSave): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('match', 'readwrite');
    transaction.objectStore('match').put(record, 'current');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the match.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Match save was cancelled.'));
  });
}
export async function loadRecord(): Promise<MatchSave | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('match', 'readonly').objectStore('match').get('current');
    request.onsuccess = () => resolve((request.result as MatchSave | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Could not read the saved match.'));
  });
}
export async function clearRecord(): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('match', 'readwrite');
    transaction.objectStore('match').delete('current');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove the match save.'));
  });
}
