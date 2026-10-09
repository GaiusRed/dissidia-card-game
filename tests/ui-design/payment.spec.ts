import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dissidia-priority-holds', JSON.stringify({ 0: true, 1: true })));
});

test('an unaffordable targeted Summon stays inspectable without opening a dead-end target draft', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('summon-without-payment');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  await page.locator('.hand-fan [data-card]').filter({ hasText: 'War Cry' }).click();

  const review = page.getByRole('button', { name: /Review Summon/ });
  const unavailable = page.getByRole('button', { name: /War Cry unavailable: You need 1 CP/ });
  await expect(review).toHaveCount(0);
  await expect(unavailable).toBeDisabled();
  await expect(unavailable).toHaveAttribute('title', 'You need 1 CP, including Commander tax.');
  await expect(page.locator('.battlefield .targetable')).toHaveCount(0);
  await expect(page.locator('#cancel-draft')).toHaveCount(0);
});


async function beginMatch(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.locator('#match-seed').fill('1');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
}

test('payment draft lets the player revise suggested CP sources before confirming a cast', async ({ page }, _info) => {
  await beginMatch(page);
  const ash = page.locator('.hand-fan [data-card]').filter({ hasText: 'Ash Recruit' });
  await ash.click();
  await page.getByRole('button', { name: /Review cast/ }).click();

  const panel = page.getByRole('region', { name: 'Payment draft' });
  await expect(panel).toBeVisible();
  await expect(page.locator('[data-event-motion]')).toHaveCount(0);
  await expect(panel).toContainText('1 CP');
  await expect(page.locator('.hand-fan')).toContainText('Ash Recruit');
  await expect(page.locator('.battlefield')).not.toContainText('Ash Recruit');
  const sources = page.locator('.card[data-payment-option]');
  await expect(sources).not.toHaveCount(0);
  await expect(page.locator('#confirm-cast')).toBeEnabled();

  await sources.first().click();
  await expect(page.locator('#confirm-cast')).toBeDisabled();
  await expect(page.locator('.event-log')).not.toContainText('was cast');
  await expect(page.locator('[data-event-motion]')).toHaveCount(0);

  await sources.nth(1).click();
  await expect(page.locator('#confirm-cast')).toBeEnabled();
  await expect(panel).toContainText('Generated 2');
  await expect(panel).toContainText('Spent 1');
  await expect(page.locator('.hand-fan')).toContainText('Ash Recruit');
  await page.getByRole('button', { name: /Confirm cast/ }).click();
  const castCard = page.locator('.battlefield [data-card]').filter({ hasText: 'Ash Recruit' });
  await expect(castCard).toBeVisible();
  await expect(castCard).toHaveAttribute('data-event-motion', 'cast');
  const animationDuration = Number.parseFloat(await castCard.evaluate(node => getComputedStyle(node).animationDuration));
  if (_info.project.use.reducedMotion === 'reduce') expect(animationDuration).toBeLessThanOrEqual(0.01);
  else expect(animationDuration).toBeGreaterThan(0.1);
});

test('Escape cancels an uncommitted payment draft without submitting the cast', async ({ page }) => {
  await beginMatch(page);
  const ash = page.locator('.hand-fan [data-card]').filter({ hasText: 'Ash Recruit' });
  await ash.click();
  await page.getByRole('button', { name: /Review cast/ }).click();
  await expect(page.getByRole('region', { name: 'Payment draft' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Payment draft' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Confirm cast/ })).toHaveCount(0);
  await expect(page.locator('.hand-fan')).toContainText('Ash Recruit');
  await expect(page.locator('.battlefield')).not.toContainText('Ash Recruit');
});

test('a replacement match clears a stale action draft with an explanation', async ({ page }) => {
  await beginMatch(page);
  await page.locator('.hand-fan .card.playable').first().click();
  await page.getByRole('button', { name: /Review cast/ }).click();
  await expect(page.getByRole('region', { name: 'Payment draft' })).toBeVisible();

  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Abandon current match' }).click();
  await page.getByRole('button', { name: 'New match', exact: true }).click();

  await expect(page.getByRole('status')).toContainText('The game state changed. Your selection has been cleared.');
  await expect(page.getByRole('region', { name: 'Payment draft' })).toHaveCount(0);
  await expect(page.locator('#cancel-draft')).toHaveCount(0);
});

test('activated abilities review source costs and targets before confirmation', async ({ page }, _info) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('commander-third-cast');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();

  const source = page.locator('.battlefield [data-card]').filter({ hasText: 'Forge Apprentice' });
  const target = page.locator('.battlefield [data-card]').filter({ hasText: 'Spark Runner' });
  await expect(source).toBeVisible();
  await expect(target).toBeVisible();
  await source.click();
  const abilityButton = page.getByRole('button', { name: 'Activate ability' });
  await expect(page.locator('.selected-preview .selection-detail')).toContainText('Choose 1 Fire Forward');
  await abilityButton.click();

  const payment = page.getByRole('region', { name: 'Payment draft' });
  await expect(payment).toBeVisible();
  await expect(payment).toContainText('Cost 0 CP');
  await expect(payment).toContainText('Dull source');
  await target.click();
  await expect(page.getByRole('button', { name: 'Confirm ability' })).toBeEnabled();
  const arrow = page.locator('.targeting-overlay line');
  await expect(arrow).toHaveCount(1);
  await page.getByRole('button', { name: 'Confirm ability' }).click();
  await expect(page.getByRole('region', { name: 'Payment draft' })).toHaveCount(0);
  await expect(page.locator('.event-log')).toContainText('activated');
  await page.locator('#pass').click();
  await page.locator('#pass').click();
  await expect(target).toContainText('5000 power');
  await expect(source).toHaveClass(/dull/);
});

test('targeting selection accepts legal cards and rejects illegal cards', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('commander-third-cast');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const source = page.locator('.battlefield [data-card]').filter({ hasText: 'Forge Apprentice' });
  const legal = page.locator('.battlefield [data-card].targetable').filter({ hasText: 'Spark Runner' });
  await source.click();
  await page.getByRole('button', { name: 'Activate ability' }).click();
  await expect(legal).toBeVisible();
  const illegal = source;

  await legal.click();
  await expect(page.locator('.targeting-overlay .target-number')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Confirm ability/ })).toBeVisible();
  await illegal.click();
  await expect(page.locator('.targeting-overlay .target-number')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Confirm ability/ })).toBeVisible();
});

test('two-target Summon selection shows order and allows targets to be revised', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('twin-embers-target-selection');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const summon = page.locator('.hand-fan [data-card]').filter({ hasText: 'Twin Embers' });
  await summon.click();
  await page.getByRole('button', { name: /Review Summon/ }).click();
  const targets = page.locator('.battlefield [data-card].targetable');
  await expect(targets).toHaveCount(2);
  const ids = await targets.evaluateAll(cards => cards.map(card => card.getAttribute('data-card')));
  const first = page.locator(`[data-card="${ids[0]}"]`);
  const second = page.locator(`[data-card="${ids[1]}"]`);
  await expect(page.locator('[aria-label="Player 1 Backups"] [data-card]')).not.toHaveClass(/targetable/);
  await first.click();
  await expect(page.locator('.targeting-overlay .target-number')).toHaveText(['1']);
  await first.click();
  await expect(page.locator('.targeting-overlay .target-number')).toHaveCount(0);
  await first.click();
  await second.click();
  await expect(page.locator('.targeting-overlay .target-number')).toHaveText(['1', '2']);
  await expect(page.getByRole('button', { name: /Confirm Summon/ })).toBeVisible();
  await expect(page.locator('.event-log')).not.toContainText('Twin Embers was cast');
});
