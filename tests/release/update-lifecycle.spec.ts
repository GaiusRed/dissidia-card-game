import { expect, test } from '@playwright/test';

async function activeWorkerBuild(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => new Promise<string>((resolve, reject) => {
    const worker = navigator.serviceWorker.controller;
    if (!worker) return reject(new Error('The page has no active service worker controller.'));
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => reject(new Error('The service worker did not return its build ID.')), 5_000);
    channel.port1.onmessage = event => {
      window.clearTimeout(timeout);
      resolve(String(event.data));
    };
    worker.postMessage({ type: 'GET_BUILD_ID' }, [channel.port2]);
  }));
}

test('keeps an active match on build A across a waiting update and offline all-tabs-closed restart', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-client-build', 'release-A');
  await page.getByRole('button', { name: 'New match' }).click();
  await page.getByRole('button', { name: 'Take first turn' }).click();
  await expect(page.getByRole('button', { name: 'Keep', exact: true })).toBeVisible();

  const savedClientBuild = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dissidia-playtest', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await new Promise<string | null>((resolve, reject) => {
      const request = db.transaction('match', 'readonly').objectStore('match').get('current');
      request.onsuccess = () => { db.close(); resolve(request.result?.clientBuild ?? null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  });
  expect(savedClientBuild).toBe('release-A');

  await page.request.post('/__test/switch?build=B');
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Install update' }).click();
  await expect(page.getByRole('status')).toContainText('Finish or abandon the current match');
  expect(await page.evaluate(() => document.documentElement.dataset.clientBuild)).toBe('release-A');
  expect(await activeWorkerBuild(page)).toBe('release-A');

  await page.close();
  await new Promise(resolve => setTimeout(resolve, 1_500));
  await context.setOffline(true);
  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(reopened.locator('html')).toHaveAttribute('data-client-build', 'release-A');
  await expect(reopened.getByRole('button', { name: 'Keep', exact: true })).toBeVisible();
  expect(await activeWorkerBuild(reopened)).toBe('release-B');
  const retainedShells = await reopened.evaluate(() => caches.keys());
  expect(retainedShells).toContain('dissidia-shell-release-A');

  await reopened.getByRole('button', { name: 'Menu', exact: true }).click();
  reopened.once('dialog', dialog => dialog.accept());
  await reopened.getByRole('button', { name: 'Abandon current match' }).click();
  await expect(reopened.getByRole('button', { name: 'New match' })).toBeEnabled();
  await reopened.reload();
  await expect(reopened.locator('html')).toHaveAttribute('data-client-build', 'release-B');
  await expect.poll(() => activeWorkerBuild(reopened)).toBe('release-B');
});

test('recovers a card-driven Commander choice on build A while build B waits offline', async ({ page, context }) => {
  await page.request.post('/__test/switch?build=A');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-client-build', 'release-A');
  await page.locator('#scenario-select').selectOption('commander-destinations');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();

  const commander = page.locator('[aria-label="Player 1 Forwards"] [data-card]').filter({ hasText: 'Cinder Marshal' });
  const tide = page.locator('.hand-fan [data-card]').filter({ hasText: 'Return Tide' });
  await tide.click();
  await page.getByRole('button', { name: 'Review Summon · 2 CP', exact: true }).click();
  await commander.click();
  await page.getByRole('button', { name: /Backup · Tide Witness · Water/ }).click();
  await page.getByRole('button', { name: 'Confirm Summon · 2 CP', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  const choice = page.getByRole('region', { name: 'Required choice' });
  await expect(choice).toContainText('Commander');

  await page.request.post('/__test/switch?build=B');
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Install update' }).click();
  await expect(page.getByRole('status')).toContainText('Finish or abandon the current match');
  expect(await activeWorkerBuild(page)).toBe('release-A');

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-client-build', 'release-A');
  await expect(page.getByRole('region', { name: 'Required choice' })).toContainText('Commander');
  expect(await activeWorkerBuild(page)).toBe('release-A');
  await page.getByRole('button', { name: /Commander Zone/ }).click();
  await expect(page.getByRole('region', { name: 'Required choice' })).toHaveCount(0);
  await expect(page.locator('[data-table-instance]').filter({ hasText: 'Cinder Marshal' })).toHaveAttribute('data-zone', 'commander');

  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Abandon current match' }).click();
  await expect(page.getByRole('button', { name: 'New match' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Install update' })).toBeEnabled();
  await page.getByRole('button', { name: 'Install update' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-client-build', 'release-B', { timeout: 15_000 });
  await expect.poll(() => activeWorkerBuild(page)).toBe('release-B');
});

test('allows a waiting update after a completed match and serves build B', async ({ page }) => {
  await page.request.post('/__test/switch?build=A');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-client-build', 'release-A');
  await page.getByRole('button', { name: 'New match' }).click();
  await page.getByRole('button', { name: 'Take first turn' }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Concede', exact: true }).click();
  await expect(page.locator('.result-overlay')).toContainText('wins');

  await page.request.post('/__test/switch?build=B');
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);
  await page.getByRole('button', { name: 'Return to menu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Install update' })).toBeEnabled();
  await page.getByRole('button', { name: 'Install update' }).click();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-client-build', 'release-B', { timeout: 15_000 });
  await expect.poll(() => activeWorkerBuild(page)).toBe('release-B');
});
