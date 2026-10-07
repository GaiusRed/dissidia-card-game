import { expect, test } from '@playwright/test';

test('preserves an incompatible save, offers export, and requires deliberate discard before a new match', async ({ page }) => {
  await page.goto('/');
  await page.locator('#match-seed').fill('91');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Required choice' })).toBeVisible();

  const incompatibleBytes = await page.evaluate(async () => {
    return await new Promise<string>((resolve, reject) => {
      const request = indexedDB.open('dissidia-playtest', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('match', 'readwrite');
        const store = transaction.objectStore('match');
        const get = store.get('current');
        let serialized = '';
        get.onerror = () => reject(get.error);
        get.onsuccess = () => {
          const save = get.result;
          save.versions.engine = 'obsolete-engine';
          save.origin.versions.engine = 'obsolete-engine';
          save.state.versions.engine = 'obsolete-engine';
          store.put(save, 'current');
          serialized = JSON.stringify(save);
        };
        transaction.oncomplete = () => { database.close(); resolve(serialized); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });

  await page.reload();
  const recovery = page.getByRole('alert');
  await expect(recovery).toContainText('engine version obsolete-engine');
  await expect(page.getByRole('button', { name: 'New match', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Start scenario', exact: true })).toBeDisabled();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export preserved save' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('dissidia-preserved-save.json');
  await expect(recovery).toBeVisible();
  const preservedBytes = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dissidia-playtest', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const saved = await new Promise<unknown>((resolve, reject) => {
      const transaction = database.transaction('match', 'readonly');
      const request = transaction.objectStore('match').get('current');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return JSON.stringify(saved);
  });
  expect(preservedBytes).toBe(incompatibleBytes);

  await page.getByRole('button', { name: 'Discard saved match data' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New match', exact: true })).toBeEnabled();
});
