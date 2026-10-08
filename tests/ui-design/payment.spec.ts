import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

async function captureState(page: import('@playwright/test').Page, info: import('@playwright/test').TestInfo, name: string) {
  const screenshot = await page.screenshot({ fullPage: true });
  const directory = resolve(process.cwd(), 'docs/ui-captures');
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, `${name}-${info.project.name}.png`), screenshot);
  await info.attach(name, { body: screenshot, contentType: 'image/png' });
  if (['casting-state', 'targeting-state'].includes(name)) {
    await expect(page).toHaveScreenshot(`${name}.png`, { animations: 'disabled', caret: 'hide', fullPage: true });
  }
}

async function beginMatch(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.locator('#match-seed').fill('1');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
}

test('payment draft lets the player revise suggested CP sources before confirming a cast', async ({ page }, info) => {
  await beginMatch(page);
  const ash = page.locator('.hand-fan [data-card]').filter({ hasText: 'Ash Recruit' });
  await ash.click();
  await page.getByRole('button', { name: /Review cast/ }).click();

  const panel = page.getByRole('region', { name: 'Payment draft' });
  await expect(panel).toBeVisible();
  await expect(page.locator('[data-event-motion]')).toHaveCount(0);
  const fieldHandGap = await page.evaluate(() => {
    const backupRow = document.querySelector<HTMLElement>('[aria-label="Player 1 Backups"]')!;
    const cards = [...document.querySelectorAll<HTMLElement>('.hand-fan .card')];
    return Math.min(...cards.map(card => card.getBoundingClientRect().top)) - backupRow.getBoundingClientRect().bottom;
  });
  expect(fieldHandGap, 'hand cards must not cover the player Backup row during payment review').toBeGreaterThanOrEqual(0);
  await expect(panel).toContainText('1 CP');
  await expect(page.locator('.hand-fan')).toContainText('Ash Recruit');
  await expect(page.locator('.battlefield')).not.toContainText('Ash Recruit');
  const panelBox = await panel.boundingBox();
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const confirmBox = await page.locator('#confirm-cast').boundingBox();
  const cancelBox = await page.locator('#cancel-draft').boundingBox();
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(panelBox && panelBox.x + panelBox.width).toBeLessThanOrEqual(viewportWidth);
  expect(panelBox && panelBox.width).toBeLessThanOrEqual(560);
  expect(panelBox && panelBox.y + panelBox.height).toBeLessThanOrEqual(viewportHeight);
  expect(confirmBox && cancelBox && Math.abs(confirmBox.width - cancelBox.width)).toBeLessThanOrEqual(2);
  expect(confirmBox && cancelBox && Math.abs(confirmBox.height - cancelBox.height)).toBeLessThanOrEqual(2);
  const reviewScreenshot = info.outputPath('payment-draft-review.png');
  await page.screenshot({ path: reviewScreenshot, fullPage: true });
  await info.attach('payment-draft-review', { path: reviewScreenshot, contentType: 'image/png' });
  await captureState(page, info, 'casting-state');
  const sources = panel.locator('[data-payment-source]');
  await expect(sources).not.toHaveCount(0);
  await expect(page.locator('#confirm-cast')).toBeEnabled();

  await panel.locator('[data-payment-source][aria-pressed="true"]').first().click();
  await expect(page.locator('#confirm-cast')).toBeDisabled();
  await expect(page.locator('.event-log')).not.toContainText('was cast');
  await expect(page.locator('[data-event-motion]')).toHaveCount(0);

  await panel.locator('[data-payment-source][aria-pressed="false"]').first().click();
  await expect(page.locator('#confirm-cast')).toBeEnabled();
  await expect(panel).toContainText('Generated 2');
  await expect(panel).toContainText('Spent 1');
  await expect(page.locator('.hand-fan')).toContainText('Ash Recruit');
  await page.getByRole('button', { name: /Confirm cast/ }).click();
  const castCard = page.locator('.battlefield [data-card]').filter({ hasText: 'Ash Recruit' });
  await expect(castCard).toBeVisible();
  await expect(castCard).toHaveAttribute('data-event-motion', 'cast');
  const animationDuration = Number.parseFloat(await castCard.evaluate(node => getComputedStyle(node).animationDuration));
  if (info.project.use.reducedMotion === 'reduce') expect(animationDuration).toBeLessThanOrEqual(0.01);
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

test('activated abilities review source costs and targets before confirmation', async ({ page }, info) => {
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
  const arrowPresentation = await page.evaluate(({ sourceId, targetId }) => {
    const line = document.querySelector<SVGLineElement>('.targeting-overlay line')!;
    const source = document.querySelector<HTMLElement>(`[data-card="${sourceId}"]`)!;
    const target = document.querySelector<HTMLElement>(`[data-card="${targetId}"]`)!;
    const app = document.querySelector<HTMLElement>('#app')!.getBoundingClientRect();
    const sourceBox = source.getBoundingClientRect();
    const targetBox = target.getBoundingClientRect();
    return { sourceMatches: Math.abs(Number(line.getAttribute('x1')) - (sourceBox.left + sourceBox.width / 2 - app.left)) < 1 &&
        Math.abs(Number(line.getAttribute('y1')) - (sourceBox.top + sourceBox.height / 2 - app.top)) < 1,
      delta: { x: Number(line.getAttribute('x2')) - (targetBox.left + targetBox.width / 2 - app.left),
        y: Number(line.getAttribute('y2')) - (targetBox.top + targetBox.height / 2 - app.top) },
      pointerEvents: getComputedStyle(document.querySelector('.targeting-overlay')!).pointerEvents };
  }, { sourceId: await source.getAttribute('data-card'), targetId: await target.getAttribute('data-card') });
  expect(arrowPresentation.sourceMatches).toBe(true);
  expect(arrowPresentation.pointerEvents).toBe('none');
  expect(Math.abs(arrowPresentation.delta.x), JSON.stringify(arrowPresentation)).toBeLessThanOrEqual(2);
  expect(Math.abs(arrowPresentation.delta.y), JSON.stringify(arrowPresentation)).toBeLessThanOrEqual(2);
  const abilityTextClipped = await abilityButton.evaluate(button => {
    const element = button as HTMLElement;
    return element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1;
  });
  expect(abilityTextClipped, 'activated ability text must fit inside its control').toBe(false);
  await captureState(page, info, 'targeting-state');
  const layoutIssues = await page.evaluate(() => {
    const issues: string[] = [];
    const handTop = document.querySelector<HTMLElement>('.hand-zone')!.getBoundingClientRect().top;
    const battlefieldBottom = document.querySelector<HTMLElement>('.battlefield')!.getBoundingClientRect().bottom;
    if (battlefieldBottom > handTop + 1) issues.push('battlefield viewport overlaps the hand');
    for (const row of document.querySelectorAll<HTMLElement>('.field-row')) {
      const area = row.getBoundingClientRect();
      for (const card of row.querySelectorAll<HTMLElement>('.card')) {
        const box = card.getBoundingClientRect();
        if (box.top < area.top - 14 || box.bottom > area.bottom + 1) issues.push(`card clipped in ${row.getAttribute('aria-label')}`);
      }
    }
    const controls = [...document.querySelectorAll<HTMLElement>(
      '.selected-preview [data-ability], .selected-preview #confirm-ability, .selected-preview #cancel-draft, .selected-preview .payment-draft',
    )].map(node => ({ label: node.id || node.getAttribute('data-ability') || 'payment', box: node.getBoundingClientRect() }));
    for (let left = 0; left < controls.length; left += 1) {
      for (let right = left + 1; right < controls.length; right += 1) {
        const a = controls[left]!.box;
        const b = controls[right]!.box;
        if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) {
          issues.push(`${controls[left]!.label} overlaps ${controls[right]!.label}`);
        }
      }
    }
    return issues;
  });
  expect(layoutIssues).toEqual([]);
  const screenshot = await page.screenshot({ fullPage: true });
  await info.attach('activated-ability-payment-review', { body: screenshot, contentType: 'image/png' });
  const evidence = resolve(process.cwd(), 'docs/ui-captures');
  mkdirSync(evidence, { recursive: true });
  writeFileSync(resolve(evidence, `payment-activation-${info.project.name}.png`), screenshot);

  await page.getByRole('button', { name: 'Confirm ability' }).click();
  await expect(page.getByRole('region', { name: 'Payment draft' })).toHaveCount(0);
  await expect(page.locator('.event-log')).toContainText('activated');
  await page.locator('#pass').click();
  await page.locator('#pass').click();
  await expect(target).toContainText('5000 power');
  await expect(source).toHaveClass(/dull/);
});

test('targeting preview snaps to legal cards and follows the cursor over illegal cards', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('commander-third-cast');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const source = page.locator('.battlefield [data-card]').filter({ hasText: 'Forge Apprentice' });
  const legal = page.locator('.battlefield [data-card].targetable').filter({ hasText: 'Spark Runner' });
  const illegal = page.locator('.battlefield [data-card]:not(.targetable)').first();
  await source.click();
  await page.getByRole('button', { name: 'Activate ability' }).click();
  await expect(legal).toBeVisible();

  const legalBox = await legal.boundingBox();
  expect(legalBox).not.toBeNull();
  await page.mouse.move(legalBox!.x + legalBox!.width / 2, legalBox!.y + legalBox!.height / 2);
  const snapped = await page.locator('.targeting-overlay .cursor-line').getAttribute('x2');
  const app = await page.locator('#app').boundingBox();
  expect(Number(snapped)).toBeCloseTo(legalBox!.x + legalBox!.width / 2 - app!.x, 0);
  await expect(page.locator('.targeting-overlay .target-snap')).toBeVisible();

  const illegalBox = await illegal.boundingBox();
  expect(illegalBox).not.toBeNull();
  const cursor = { x: illegalBox!.x + illegalBox!.width / 2, y: illegalBox!.y + illegalBox!.height / 2 };
  await page.mouse.move(cursor.x, cursor.y);
  const endpoint = await page.locator('.targeting-overlay .cursor-line').evaluate(line => ({
    x: Number(line.getAttribute('x2')), y: Number(line.getAttribute('y2')),
  }));
  expect(endpoint.x).toBeCloseTo(cursor.x - app!.x, 0);
  expect(endpoint.y).toBeCloseTo(cursor.y - app!.y, 0);
  await expect(page.locator('.targeting-overlay .target-snap')).toHaveCount(0);
  await expect(legal).toHaveClass(/targetable/);
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
