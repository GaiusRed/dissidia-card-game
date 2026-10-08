import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Final Spark resolves through a private EX decision without bypassing its required choice', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('multi-ex');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const spark = page.locator('.hand-fan [data-card]').filter({ hasText: 'Final Spark' });
  await spark.click();
  await page.getByRole('button', { name: 'Review Summon · 4 CP', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm Summon · 4 CP', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  const choice = page.getByRole('region', { name: 'Required choice' });
  await expect(choice).toBeVisible();
  await expect(choice).toContainText('EX Burst');
  const sequenceBefore = Number(await page.locator('.table').getAttribute('data-view-seq'));
  const screenshot = await page.screenshot({ fullPage: true });
  const captureDirectory = resolve(process.cwd(), 'docs/ui-captures');
  mkdirSync(captureDirectory, { recursive: true });
  writeFileSync(resolve(captureDirectory, `choice-ex-${test.info().project.name}.png`), screenshot);
  await test.info().attach('choice-ex', { body: screenshot, contentType: 'image/png' });
  await expect(page).toHaveScreenshot('choice-ex.png', { animations: 'disabled', caret: 'hide', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(choice).toBeVisible();
  await page.getByRole('button', { name: /Inspect Player/ }).click();
  await expect(choice).toContainText('making a private choice');
  await page.getByRole('button', { name: /Inspect Player/ }).click();
  await expect(choice).toContainText('EX Burst');
  await expect(choice.locator('.eyebrow')).toContainText('PLAYER 2 DECISION');
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', String(sequenceBefore));
  await page.getByRole('button', { name: /Skip/ }).click();
  await expect.poll(async () => Number(await page.locator('.table').getAttribute('data-view-seq'))).toBe(sequenceBefore + 1);
  await expect(choice).toBeVisible();
  await expect(choice).toContainText('EX Burst');
  await page.getByRole('button', { name: /Skip/ }).click();
  await expect(page.getByRole('button', { name: 'Pass priority' })).toBeVisible();
});

test('using Archive Keeper EX preserves its follow-up discard choice', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('multi-ex');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  await page.locator('.hand-fan [data-card]').filter({ hasText: 'Final Spark' }).click();
  await page.getByRole('button', { name: 'Review Summon · 4 CP', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm Summon · 4 CP', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  const choice = page.getByRole('region', { name: 'Required choice' });
  await expect(choice).toContainText('Archive Keeper EX Burst');
  await page.getByRole('button', { name: 'Use effect', exact: true }).click();
  await expect(choice).toContainText('Archive Keeper: discard 1 card.');
  await expect(page.locator('[data-choice]')).toHaveCount(1);
  const sequenceBeforeDiscard = Number(await page.locator('.table').getAttribute('data-view-seq'));
  await page.locator('[data-choice]').click();
  await expect.poll(async () => Number(await page.locator('.table').getAttribute('data-view-seq'))).toBe(sequenceBeforeDiscard + 1);
});

test('two-card End Phase discard stays local until a valid confirmed answer', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('end-phase-two-card-discard');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  const choice = page.getByRole('region', { name: 'Required choice' });
  await expect(choice).toContainText('discard 2 cards');
  const screenshot = await page.screenshot({ fullPage: true });
  const captureDirectory = resolve(process.cwd(), 'docs/ui-captures');
  mkdirSync(captureDirectory, { recursive: true });
  writeFileSync(resolve(captureDirectory, `choice-discard-${test.info().project.name}.png`), screenshot);
  await test.info().attach('choice-discard', { body: screenshot, contentType: 'image/png' });
  const sequenceBefore = Number(await page.locator('.table').getAttribute('data-view-seq'));
  const options = page.locator('[data-choice]');
  await expect(options).toHaveCount(7);
  const confirm = page.getByRole('button', { name: 'Confirm choice' });
  const panelBounds = await choice.boundingBox();
  const confirmBounds = await confirm.boundingBox();
  expect(panelBounds).not.toBeNull();
  expect(confirmBounds).not.toBeNull();
  expect(confirmBounds!.x + confirmBounds!.width).toBeLessThanOrEqual(panelBounds!.x + panelBounds!.width);
  expect(await confirm.evaluate(button => {
    const rect = button.getBoundingClientRect();
    const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return !!target && (target === button || button.contains(target));
  })).toBe(true);
  await options.nth(0).click();
  await expect(options.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Confirm choice' })).toBeDisabled();
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', String(sequenceBefore));
  await page.reload();
  await expect(choice).toContainText('discard 2 cards');
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', String(sequenceBefore));
  const reloadedOptions = page.locator('[data-choice]');
  await expect(reloadedOptions.nth(0)).toHaveAttribute('aria-pressed', 'false');
  await reloadedOptions.nth(0).click();
  await reloadedOptions.nth(1).click();
  await expect(page.getByRole('button', { name: 'Confirm choice' })).toBeEnabled();
  await reloadedOptions.nth(0).click();
  await expect(page.getByRole('button', { name: 'Confirm choice' })).toBeDisabled();
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', String(sequenceBefore));
  await reloadedOptions.nth(0).click();
  await page.getByRole('button', { name: 'Confirm choice' }).click();
  await expect.poll(async () => Number(await page.locator('.table').getAttribute('data-view-seq'))).toBe(sequenceBefore + 1);
  await expect(choice).toHaveCount(0);
  await expect(page.locator('.break-pile')).toContainText('2');
});

test('a rejected choice answer keeps its local selection when authority does not change', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('end-phase-two-card-discard');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  await page.evaluate(() => {
    const original = crypto.randomUUID.bind(crypto);
    Object.defineProperty(window, '__commandId', { configurable: true, writable: true, value: 'reused-command-id' });
    Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: () => (window as typeof window & { __commandId: string | null }).__commandId ?? original() });
  });

  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.evaluate(() => { (window as typeof window & { __commandId: string | null }).__commandId = null; });
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();

  const choice = page.getByRole('region', { name: 'Required choice' });
  await expect(choice).toContainText('discard 2 cards');
  const options = page.locator('[data-choice]');
  const sequence = Number(await page.locator('.table').getAttribute('data-view-seq'));
  await options.nth(0).click();
  await options.nth(1).click();
  await expect(page.getByRole('button', { name: 'Confirm choice' })).toBeEnabled();

  await page.evaluate(() => { (window as typeof window & { __commandId: string | null }).__commandId = 'reused-command-id'; });
  await page.getByRole('button', { name: 'Confirm choice' }).click();

  await expect(page.getByRole('status')).toContainText('already used for a different action');
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', String(sequence));
  await expect(options.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(options.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Confirm choice' })).toBeEnabled();
});

test('Tide Warden Commander opens a required entry target choice when its trigger resolves', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('commander-entry-target');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const commander = page.locator('.own-zones [data-card]').filter({ hasText: 'Tide Warden' });
  await commander.click();
  await page.getByRole('button', { name: /Review Cast Commander/ }).click();
  const confirm = page.getByRole('button', { name: /Confirm Commander cast/ });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  const choice = page.getByRole('region', { name: 'Required choice' });
  await expect(choice).toContainText('Tide Warden: choose a target.');
  const sequenceBefore = Number(await page.locator('.table').getAttribute('data-view-seq'));
  const target = page.locator('[data-choice]').filter({ hasText: 'Spark Runner' });
  await target.click();
  await expect.poll(async () => Number(await page.locator('.table').getAttribute('data-view-seq'))).toBe(sequenceBefore + 1);
  await expect(choice).toHaveCount(0);
  await expect(page.locator('[aria-label="Player 1 Forwards"]')).toContainText('Spark Runner');
});
