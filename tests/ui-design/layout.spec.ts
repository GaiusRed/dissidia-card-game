import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

let browserErrors: string[] = [];
test.beforeEach(async ({ page }) => {
  browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
});
test.afterEach(() => {
  expect(browserErrors, 'UI design flow must not produce browser errors').toEqual([]);
});

async function capture(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  const screenshot = await page.screenshot({ path, fullPage: true });
  await info.attach(name, { body: screenshot, contentType: 'image/png' });
  if (name === 'crowded-board') {
    const evidence = resolve(process.cwd(), 'docs/ui-captures');
    mkdirSync(evidence, { recursive: true });
    writeFileSync(resolve(evidence, `${name}-${info.project.name}.png`), screenshot);
  }
}

async function start(page: Page) {
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await expect(page.locator('#pass')).toBeVisible();
}

test('hand hover is unclipped, Commander identity is unique, and inspection changes the hand', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page);
  await capture(page, info, 'normal-start');
  const duplicates = await page.locator('[data-card]').evaluateAll(nodes => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      const id = (node as HTMLElement).dataset.card!;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts].filter(([, count]) => count > 1);
  });
  expect.soft(duplicates, 'One interactive representation per physical card').toEqual([]);
  const card = page.locator('.hand-fan .card').last();
  await card.hover();
  await card.evaluate(async node => {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await Promise.all(node.getAnimations().map(animation => animation.finished.catch(() => undefined)));
  });
  const clipping = await card.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    const clips: string[] = [];
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const box = parent.getBoundingClientRect();
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY) && (bounds.top < box.top - 1 || bounds.bottom > box.bottom + 1)) clips.push(parent.className);
    }
    if (bounds.top < 0 || bounds.bottom > innerHeight) clips.push('viewport');
    return clips;
  });
  await capture(page, info, 'hand-hover');
  expect.soft(clipping, 'Lifted card must escape scroll clipping').toEqual([]);
  const before = await page.locator('.hand-zone > .zone-label').textContent();
  const requestedSeat = (await page.locator('#inspect').textContent())?.match(/Player (\d)/)?.[1];
  await page.locator('#inspect').click();
  const changedHand = await page.locator('.hand-zone > .zone-label').textContent() !== before;
  const inspectorCards = await page.getByRole('region', { name: `Player ${requestedSeat} hand`, exact: true }).locator('[data-card]').count();
  expect.soft(changedHand || inspectorCards > 0, 'Inspect must show the other hand in the table or a labeled inspection browser').toBe(true);
  expect.soft(errors).toEqual([]);
  if (info.project.use.reducedMotion === 'reduce') {
    const duration = await card.evaluate(node => getComputedStyle(node).transitionDuration);
    expect.soft(duration.split(',').every(value => parseFloat(value) <= 0.01), 'Reduced motion removes card travel transitions').toBe(true);
  }
});

test('hand sizes 0, 1, 5, 7, 10, and 19 stay reachable without clipping', async ({ page }, info) => {
  await start(page);
  const hand = page.locator('.hand-fan');
  const cardMarkup = await hand.locator('.card').first().evaluate(node => node.outerHTML);
  for (const count of [0, 1, 5, 7, 10, 19]) {
    await hand.evaluate((node, args) => {
      node.innerHTML = Array.from({ length: args.count }, (_, index) => args.markup.replace(/data-card="[^"]*"/, `data-card="ui-${index}"`))
        .join('');
    }, { count, markup: cardMarkup });
    await expect(hand.locator('.card')).toHaveCount(count);
    if (count === 0) continue;
    const last = hand.locator('.card').last();
    await last.scrollIntoViewIfNeeded();
    await last.hover();
    const geometry = await last.evaluate(node => {
      const card = node.getBoundingClientRect();
      return { clipped: card.left < 0 || card.right > innerWidth || card.top < 0 || card.bottom > innerHeight,
        scrolled: (node.parentElement as HTMLElement).scrollLeft > 0 };
    });
    expect(geometry.clipped, `The last card is fully visible with ${count} cards`).toBe(false);
    if (count === 19) expect(geometry.scrolled, 'Overflow hand cards remain reachable through horizontal scrolling').toBe(true);
  }
  await capture(page, info, 'hand-size-matrix');
});

test('crowded battlefield separates both players and controls stay reachable', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('control-conflict');
  await page.locator('#start-scenario').click();
  await expect(page.locator('.battlefield .card')).toHaveCount(9);
  await capture(page, info, 'crowded-board');
  // Semantic rows are the presentation contract, not a color-only distinction.
  for (const seat of [1, 2]) {
    for (const type of ['Forwards', 'Backups']) {
      expect.soft(await page.getByRole('region', { name: `Player ${seat} ${type}`, exact: true }).count(), `Player ${seat} ${type} row`).toBe(1);
    }
  }
  const rowCenters = await page.evaluate(() => {
    const bounds = (seat: number, type: 'Forwards' | 'Backups') => {
      const rect = document.querySelector<HTMLElement>(`[aria-label="Player ${seat} ${type}"]`)!.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    };
    return {
      opponentForwards: bounds(1, 'Forwards'), opponentBackups: bounds(1, 'Backups'),
      playerForwards: bounds(2, 'Forwards'), playerBackups: bounds(2, 'Backups'),
      opponentZonesBottom: document.querySelector<HTMLElement>('.player-row.opponent')!.getBoundingClientRect().bottom,
      handTop: document.querySelector<HTMLElement>('.hand-zone')!.getBoundingClientRect().top,
      battlefieldBottom: document.querySelector<HTMLElement>('.battlefield')!.getBoundingClientRect().bottom,
    };
  });
  expect(rowCenters.opponentBackups.bottom).toBeLessThanOrEqual(rowCenters.opponentForwards.top + 4);
  expect(rowCenters.playerForwards.bottom).toBeLessThanOrEqual(rowCenters.playerBackups.top + 4);
  expect(rowCenters.opponentForwards.bottom).toBeLessThanOrEqual(rowCenters.playerForwards.top + 6);
  expect(rowCenters.opponentZonesBottom).toBeLessThanOrEqual(rowCenters.opponentBackups.top + 2);
  expect(rowCenters.battlefieldBottom).toBeLessThanOrEqual(rowCenters.handTop + 2);
  await page.locator('.battlefield').evaluate(node => { node.scrollTop = node.scrollHeight; });
  const browsedBottom = await page.evaluate(() => ({
    rowBottom: document.querySelector<HTMLElement>('[aria-label="Player 2 Backups"]')!.getBoundingClientRect().bottom,
    fieldBottom: document.querySelector<HTMLElement>('.battlefield')!.getBoundingClientRect().bottom,
  }));
  expect(browsedBottom.rowBottom).toBeLessThanOrEqual(browsedBottom.fieldBottom + 1);
  const hiddenControls = await page.locator('.top-actions button, .phase-controls button, .choice-actions button').evaluateAll(nodes => nodes.flatMap(node => {
    const r = node.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight || !hit || !node.contains(hit)
      ? [(node.textContent ?? '').trim()] : [];
  }));
  expect.soft(hiddenControls, 'Visible controls must be inside the viewport and receive pointer input').toEqual([]);
});

test('attack party selection submits all selected Forwards together', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('party-first-strike');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  const members = page.locator('[aria-label="Player 2 Forwards"] [data-card]');
  const count = await members.count();
  expect(count).toBeGreaterThanOrEqual(2);
  for (let index = 0; index < 2; index += 1) {
    await members.nth(index).click();
    await page.getByRole('button', { name: 'Add to attack party' }).click();
  }
  const attack = page.getByRole('button', { name: 'Attack with 2 Forwards' });
  await expect(attack).toBeVisible();
  await members.nth(0).click();
  await page.getByRole('button', { name: 'Remove from attack party' }).click();
  await expect(page.getByRole('button', { name: 'Attack with 1 Forward' })).toBeVisible();
  await members.nth(0).click();
  await page.getByRole('button', { name: 'Add to attack party' }).click();
  await expect(page.getByRole('button', { name: 'Attack with 2 Forwards' })).toBeVisible();
  const peerHeights = await page.locator('.selected-preview button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  expect(Math.max(...peerHeights) - Math.min(...peerHeights)).toBeLessThanOrEqual(1);
  await attack.click();
  await expect(page.getByRole('button', { name: 'Attack with 2 Forwards' })).toHaveCount(0);
  await expect(page.locator('.event-log')).toContainText('combat attack declared');
});

test('contextual choices use consistent control heights without hiding the hand', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.locator('#new-match').click();
  const heights = await page.locator('.choice-actions button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  expect.soft(Math.max(...heights) - Math.min(...heights), 'Peer choice buttons have equal height').toBeLessThanOrEqual(1);
  await capture(page, info, 'starting-choice');
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  await page.getByRole('button', { name: 'Redraw', exact: true }).click();
  const overlap = await page.locator('.choice-panel').evaluate(panel => {
    const a = panel.getBoundingClientRect();
    return [...document.querySelectorAll('.hand-fan .card')].filter(card => {
      const b = card.getBoundingClientRect();
      return Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
    }).length;
  });
  await capture(page, info, 'mulligan-choice');
  expect.soft(overlap, 'Choice dock must not cover cards needed for the decision').toBe(0);
});

test('deck search retains focus through a real typing sequence', async ({ page }, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deck editor', exact: true }).click();
  const search = page.getByLabel('SEARCH', { exact: true });
  await search.click();
  await search.pressSequentially('Tide', { delay: 50 });
  await capture(page, info, 'deck-search');
  expect.soft(await search.inputValue(), 'Rerender must retain input focus and all typed characters').toBe('Tide');
  await expect.soft(search).toBeFocused();
});

test('multi-card mulligan order is editable and requires explicit confirmation', async ({ page }, info) => {
  // Use the real multi-card mulligan order choice so save reconstruction remains authoritative.
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  const choicePanel = page.getByRole('region', { name: 'Required choice' });
  await page.getByRole('button', { name: 'Redraw', exact: true }).click();
  await expect(choicePanel).toContainText('Choose order 0/5');
  await capture(page, info, 'five-card-mulligan-order');
  expect.soft(await choicePanel.getByRole('button', { name: /Confirm/ }).count(),
    'A mandatory multi-card decision needs a Confirm control').toBe(1);
  await page.getByRole('button', { name: /Inspect Player/ }).click();
  await expect(choicePanel).toContainText('Player 1 is making a private choice');
  await page.getByRole('button', { name: /Inspect Player/ }).click();
  await expect(choicePanel).toContainText('Choose order 0/5');
  const options = page.locator('[data-order-choice]');
  for (let index = 0; index < 5; index += 1) await options.nth(index).click();
  await expect(page.getByRole('button', { name: 'Confirm order' })).toBeEnabled();
  await page.getByRole('button', { name: 'Confirm order' }).click();
  await expect(choicePanel).toContainText('Keep your opening hand or redraw it once.');
});

test('party blockers are selectable through the pass window', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('party-first-strike');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  const attackers = page.locator('[aria-label="Player 2 Forwards"] [data-card]');
  for (let index = 0; index < 2; index += 1) {
    await attackers.nth(index).click();
    await page.getByRole('button', { name: 'Add to attack party' }).click();
  }
  await page.getByRole('button', { name: 'Attack with 2 Forwards' }).click();
  // Both sides pass priority before the defender gets the block window.
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await expect(page.locator('[aria-label="Player 1 Forwards"] [data-card]')).toHaveCount(1);
  await page.locator('[aria-label="Player 1 Forwards"] [data-card]').click();
  await page.getByRole('button', { name: 'Block this attack' }).click();
  await capture(page, info, 'party-allocation');
  await expect(page.locator('.event-log')).toContainText('combat block declared');
  await expect(page.locator('.event-log')).toContainText('combat blockers opened');
});

test('selected-card actions fit the footer and use equal peer button heights', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('party-first-strike');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  const card = page.locator('[aria-label="Player 2 Forwards"] [data-card]').first();
  await card.click();
  await expect(page.locator('#toggle-party-member')).toBeVisible();
  await page.locator('#toggle-party-member').click();
  await capture(page, info, 'selected-actions');
  const geometry = await page.locator('.selected-preview button').evaluateAll(nodes => {
    const footer = document.querySelector('.bottom-bar')!.getBoundingClientRect();
    const rects = nodes.map(node => node.getBoundingClientRect());
    return { heights: rects.map(rect => rect.height), outside: rects.some(rect => rect.top < footer.top || rect.bottom > footer.bottom),
      occluded: nodes.some(node => {
        const r = node.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !hit || !node.contains(hit);
      }) };
  });
  expect.soft(geometry.outside, 'Card actions fit their reserved footer area').toBe(false);
  expect.soft(geometry.occluded, 'Card actions receive pointer input').toBe(false);
  expect.soft(Math.max(...geometry.heights) - Math.min(...geometry.heights), 'Peer card actions use equal heights').toBeLessThanOrEqual(1);
});
