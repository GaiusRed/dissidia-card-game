import { test, expect, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.addInitScript(() => localStorage.setItem('dissidia-priority-holds', JSON.stringify({ 0: true, 1: true })));
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
}

test('all own piles remain clickable beside the hand and battlefield fits vertically', async ({ page }) => {
  await start(page);
  for (const zone of ['deck', 'break zone', 'damage zone', 'removed zone']) {
    await page.getByRole('button', { name: `Inspect Player 1 ${zone}`, exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  const bounds = await page.locator('.battlefield').evaluate(node => ({ height: node.clientHeight, content: node.scrollHeight }));
  expect(bounds.content).toBeLessThanOrEqual(bounds.height + 1);
});

test('selection can be cleared and inspection has separate face and details', async ({ page }) => {
  await start(page);
  await expect(page.locator('.hand-fan [data-card]').filter({ hasText: 'Final Spark' }).locator('.card-rules')).toContainText('2 points of damage');
  const rules = await page.locator('.hand-fan [data-card]').filter({ hasText: 'Cinder Witness' }).locator('.card-rules').evaluate(node => ({ visible: node.clientHeight, content: node.scrollHeight }));
  expect(rules.content).toBeLessThanOrEqual(rules.visible + 1);
  const card = page.locator('.hand-fan [data-card]').first();
  await card.click();
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
  await expect(page.locator('.selected-preview')).toHaveCount(0);
  await card.click({ button: 'right' });
  const inspector = page.getByRole('dialog');
  await expect(inspector.locator('.inspector-details')).toBeVisible();
  await expect(inspector.locator('.inspector-face')).toBeVisible();
  await expect(inspector.locator('.inspector-details')).toContainText(/P-\d/);
  await expect(page.locator('.hand-fan .card-number')).toHaveCount(0);
});

test('log can be hidden and reopened without losing the current turn header', async ({ page }) => {
  await start(page);
  await expect(page.locator('.log-header')).toContainText('Turn 1');
  const before = await page.locator('.center-table').boundingBox();
  await page.getByRole('button', { name: 'Hide log', exact: true }).click();
  await expect(page.locator('.event-log')).toHaveCount(0);
  const after = await page.locator('.center-table').boundingBox();
  expect(after!.width).toBeGreaterThan(before!.width);
  await page.getByRole('button', { name: 'Show log', exact: true }).click();
  await expect(page.locator('.log-header')).toContainText('Turn 1');
});


test('card faces stay portrait and pile labels fit their buttons', async ({ page }) => {
  await start(page);
  const card = page.locator('.hand-fan [data-card]').first();
  await expect(card).toBeVisible();
  const bounds = await card.boundingBox();
  expect(bounds!.width / bounds!.height).toBeCloseTo(63 / 88, 2);
  for (const label of await page.locator('.zone-pile span').all()) {
    const size = await label.evaluate(node => ({ visible: node.clientWidth, content: node.scrollWidth }));
    expect(size.content).toBeLessThanOrEqual(size.visible + 1);
  }
  await card.click({ button: 'right' });
  await expect(page.locator('.inspector-face')).toBeVisible();
  const face = await page.locator('.inspector-face').boundingBox();
  expect(face!.width / face!.height).toBeCloseTo(63 / 88, 2);
  await page.screenshot({ path: `test-results/portrait-${test.info().project.name}.png` });
});

test('ineligible payment clicks do not replace the card being cast', async ({ page }) => {
  await start(page);
  await page.locator('.hand-fan .card.playable').first().click();
  const selected = await page.locator('.hand-fan .card.selected').getAttribute('data-card');
  await page.getByRole('button', { name: /Review (cast|Summon)/ }).click();
  const payment = page.locator('.payment-selected');
  const before = await payment.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-card')));
  const ineligible = page.locator('.own-zones .card');
  await ineligible.click();
  await expect(ineligible).not.toHaveClass(/selected/);
  await expect(page.locator('.hand-fan .card.selected')).toHaveAttribute('data-card', selected!);
  expect(await payment.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-card')))).toEqual(before);
});

test('the match log presents new events above older history', async ({ page }) => {
  await start(page);
  const entries = page.locator('.event-log [role="log"] li');
  const before = await entries.first().getAttribute('data-rule-event');
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await expect(entries.first()).toContainText('passed priority');
  expect(await entries.first().getAttribute('data-rule-event')).not.toBe(before);
  expect(await page.locator('.event-log [role="log"]').evaluate(node => node.scrollTop)).toBe(0);
});


test('field cards remain portrait and readable in the available battlefield', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('battlefield-card-status');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const cards = page.locator('.battlefield .card');
  await expect(cards.first()).toBeVisible();
  for (const card of await cards.all()) {
    const size = await card.evaluate(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height,
      portraitWidth: (node as HTMLElement).offsetWidth, portraitHeight: (node as HTMLElement).offsetHeight }));
    expect(size.portraitWidth / size.portraitHeight).toBeCloseTo(63 / 88, 1);
    expect(size.portraitWidth).toBeGreaterThanOrEqual(60);
  }
  await page.screenshot({ path: `playwright-report/visual/field-${test.info().project.name}.png` });
});
