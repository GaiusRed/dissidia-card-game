import type { DeckList } from '../rules/types';

export interface SavedDeck { id: string; name: string; deck: DeckList }
export async function saveDeck(deck: SavedDeck): Promise<void> {
  const open = indexedDB.open('dissidia-playtest', 1);
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('match')) open.result.createObjectStore('match');
      if (!open.result.objectStoreNames.contains('decks')) open.result.createObjectStore('decks', { keyPath: 'id' });
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('decks', 'readwrite'); transaction.objectStore('decks').put(deck);
    transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}
export async function loadDecks(): Promise<SavedDeck[]> {
  const open = indexedDB.open('dissidia-playtest', 1);
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('match')) open.result.createObjectStore('match');
      if (!open.result.objectStoreNames.contains('decks')) open.result.createObjectStore('decks', { keyPath: 'id' });
    };
    open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
  });
  if (!db.objectStoreNames.contains('decks')) { db.close(); return []; }
  const result = await new Promise<SavedDeck[]>((resolve, reject) => {
    const request = db.transaction('decks', 'readonly').objectStore('decks').getAll();
    request.onsuccess = () => resolve(request.result as SavedDeck[]); request.onerror = () => reject(request.error);
  });
  db.close(); return result;
}
