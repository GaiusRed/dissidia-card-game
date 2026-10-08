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
  if (['idle-table', 'hand-hover', 'stack-state'].includes(name)) {
    await expect(page.locator('#offline-status')).toHaveText('OFFLINE READY');
  }
  const screenshot = await page.screenshot({ path, fullPage: true });
  await info.attach(name, { body: screenshot, contentType: 'image/png' });
  if (['idle-table', 'hand-hover', 'stack-state', 'editor-inspection-catalog'].includes(name)) {
    await expect(page).toHaveScreenshot(`${name}.png`, { animations: 'disabled', caret: 'hide', fullPage: true });
  }
  if (['crowded-board', 'commander-inspection', 'party-allocation', 'starting-choice', 'mulligan-choice', 'five-card-mulligan-order', 'editor-inspection-catalog', 'editor-inspection-deck', 'idle-table', 'hand-hover', 'stack-state', 'stack-two-triggers', 'result-overlay'].includes(name)) {
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

test('finished-match actions remain clear, export the completed save, and return to the menu', async ({ page }, info) => {
  await start(page);
  await page.getByRole('button', { name: 'Concede', exact: true }).click();
  const result = page.locator('.result-overlay');
  await expect(result).toContainText('wins');
  await expect(result.getByRole('button', { name: 'New match', exact: true })).toBeVisible();
  const exportButton = result.getByRole('button', { name: 'Export save', exact: true });
  await expect(exportButton).toBeVisible();
  const menuButton = result.getByRole('button', { name: 'Return to menu', exact: true });
  await expect(menuButton).toBeVisible();
  const geometry = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll<HTMLElement>('.result-overlay button')].map(button => button.getBoundingClientRect());
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const overlay = document.querySelector<HTMLElement>('.result-overlay')!;
    return { buttons: buttons.map(box => ({ left: box.left, right: box.right, top: box.top, bottom: box.bottom,
      width: box.width, height: box.height })), viewport, background: getComputedStyle(overlay).backgroundColor };
  });
  expect(geometry.background).toBe('rgba(247, 245, 239, 0.96)');
  expect(geometry.buttons).toHaveLength(3);
  for (const button of geometry.buttons) {
    expect(button.left).toBeGreaterThanOrEqual(0);
    expect(button.top).toBeGreaterThanOrEqual(0);
    expect(button.right).toBeLessThanOrEqual(geometry.viewport.width);
    expect(button.bottom).toBeLessThanOrEqual(geometry.viewport.height);
  }
  expect(geometry.buttons[0]!.bottom).toBeLessThanOrEqual(geometry.buttons[1]!.top);
  expect(geometry.buttons[1]!.bottom).toBeLessThanOrEqual(geometry.buttons[2]!.top);
  for (const button of geometry.buttons.slice(1)) {
    expect(Math.abs(geometry.buttons[0]!.width - button.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.buttons[0]!.height - button.height)).toBeLessThanOrEqual(2);
  }
  await capture(page, info, 'result-overlay');
  const downloadReady = page.waitForEvent('download');
  await exportButton.click();
  expect((await downloadReady).suggestedFilename()).toMatch(/dissidia-turn-.*\.json/);
  await menuButton.click();
  await expect(page.getByRole('button', { name: 'New match', exact: true })).toBeVisible();
});

test('keeps all four empty field rows labeled from either player view', async ({ page }, info) => {
  await start(page);
  for (const seat of [1, 2]) {
    await expect(page.getByRole('region', { name: `Player ${seat} Forwards`, exact: true })).toContainText('No forwards');
    await expect(page.getByRole('region', { name: `Player ${seat} Backups`, exact: true })).toContainText('No backups');
  }
  await page.getByRole('button', { name: /Inspect Player/ }).click();
  await expect(page.getByRole('region', { name: 'Player 1 Forwards', exact: true })).toContainText('No forwards');
  await expect(page.getByRole('region', { name: 'Player 2 Backups', exact: true })).toContainText('No backups');
  await capture(page, info, 'idle-table');
});

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
  expect.soft(clipping, 'Lifted card must escape scroll clipping').toEqual([]);
  await capture(page, info, 'hand-hover');
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

test('keyboard focus stays visible and Enter opens hand-card inspection', async ({ page }) => {
  await start(page);
  const card = page.locator('.hand-fan [data-card]').first();
  for (let index = 0; index < 50 && !(await card.evaluate(node => document.activeElement === node)); index += 1) {
    await page.keyboard.press('Tab');
  }
  await expect(card).toBeFocused();
  const focus = await card.evaluate(node => {
    const style = getComputedStyle(node);
    return { width: style.outlineWidth, style: style.outlineStyle };
  });
  expect(focus).toEqual({ width: '3px', style: 'solid' });
  await page.keyboard.press('Enter');
  await expect(card).toHaveClass(/selected/);
  await expect(page.locator('.selected-preview')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.selected-preview')).toHaveCount(0);
  await expect(page.locator('.empty-selection')).toBeVisible();
});

test('Tab reaches every card in a maximum-size hand and scrolls focused cards into view', async ({ page }) => {
  await start(page);
  const hand = page.locator('.hand-fan');
  const template = await hand.locator('.card').first().evaluate(node => node.outerHTML);
  await hand.evaluate((node, markup) => {
    node.innerHTML = Array.from({ length: 19 }, (_, index) => markup
      .replace(/data-card="[^"]*"/, `data-card="keyboard-${index}"`)
      .replace(/data-table-instance="[^"]*"/, `data-table-instance="keyboard-${index}"`))
      .join('');
  }, template);
  const cards = hand.locator('.card');
  await cards.first().focus();
  for (let index = 0; index < 19; index += 1) {
    if (index > 0) await page.keyboard.press('Tab');
    await expect(cards.nth(index)).toBeFocused();
    const position = await cards.nth(index).evaluate(node => {
      const rect = node.getBoundingClientRect();
      return { visible: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
        scrollLeft: (node.parentElement as HTMLElement).scrollLeft };
    });
    expect(position.visible, `Keyboard card ${index + 1} remains in the viewport`).toBe(true);
    if (index === 18) expect(position.scrollLeft).toBeGreaterThan(0);
  }
});

test('crowded battlefield separates both players and controls stay reachable', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('control-conflict');
  await page.locator('#start-scenario').click();
  await expect(page.locator('.battlefield .card')).toHaveCount(9);
  const physicalInstances = await page.locator('.table [data-table-instance]').evaluateAll(nodes =>
    nodes.map(node => (node as HTMLElement).dataset.tableInstance));
  expect(physicalInstances.length).toBeGreaterThanOrEqual(9);
  expect(new Set(physicalInstances).size).toBe(physicalInstances.length);
  await expect(page.locator('.battlefield .card.dull').first()).toBeVisible();
  await expect(page.locator('#game-canvas')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#game-canvas [data-table-instance]')).toHaveCount(0);
  const paintedCanvas = await page.locator('#game-canvas canvas').evaluate(canvas => {
    const rect = canvas.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
      viewportWidth: innerWidth, viewportHeight: innerHeight, backingWidth: (canvas as HTMLCanvasElement).width,
      backingHeight: (canvas as HTMLCanvasElement).height };
  });
  expect(paintedCanvas.left).toBe(0);
  expect(paintedCanvas.top).toBe(0);
  expect(paintedCanvas.right).toBe(paintedCanvas.viewportWidth);
  expect(paintedCanvas.bottom).toBe(paintedCanvas.viewportHeight);
  expect(paintedCanvas.backingWidth).toBeGreaterThan(0);
  expect(paintedCanvas.backingHeight).toBeGreaterThan(0);
  const fieldCard = page.locator('.battlefield [data-table-instance]').first();
  const fieldCardHit = await fieldCard.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    const hit = (x: number, y: number) => {
      const target = document.elementFromPoint(x, y);
      return !!target && (target === node || node.contains(target));
    };
    return { center: hit(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2), edge: hit(bounds.x + 2, bounds.y + bounds.height / 2) };
  });
  expect(fieldCardHit).toEqual({ center: true, edge: true });
  const obscuredHandTitles = await page.locator('.hand-fan').evaluate(hand => {
    const cards = [...hand.querySelectorAll<HTMLElement>('.card')];
    return cards.flatMap((card, index) => {
      const title = card.querySelector('strong');
      const text = title?.firstChild;
      if (!title || !text || text.nodeType !== Node.TEXT_NODE) return [];
      const range = document.createRange();
      range.selectNodeContents(title);
      const titleLines = [...range.getClientRects()];
      const nextLeft = cards[index + 1]?.getBoundingClientRect().left ?? Infinity;
      return titleLines.some(line => line.right > nextLeft + 1) ? [title.textContent?.trim() ?? 'unknown'] : [];
    });
  });
  expect(obscuredHandTitles, 'Every visible hand-card title must remain readable beside its neighbor').toEqual([]);
  const commanderHandOverlap = await page.locator('.own-zones .card').evaluate(commander => {
    const a = commander.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>('.hand-fan .card')].filter(card => {
      const b = card.getBoundingClientRect();
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }).map(card => card.textContent?.trim() ?? 'unknown');
  });
  expect(commanderHandOverlap, 'The hand must not cover the Commander Zone card').toEqual([]);
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
      opponentCommander: (() => {
        const card = document.querySelector<HTMLElement>('.opponent-zones .card, .opponent-zones .commander-status');
        if (!card) return null;
        const rect = card.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      })(),
      opponentSeat: (() => {
        const rect = document.querySelector<HTMLElement>('.player-row.opponent')!.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      })(),
      handTop: document.querySelector<HTMLElement>('.hand-zone')!.getBoundingClientRect().top,
      battlefieldBottom: document.querySelector<HTMLElement>('.battlefield')!.getBoundingClientRect().bottom,
    };
  });
  const seatAccents = await page.evaluate(() => [0, 1].map(seat =>
    getComputedStyle(document.querySelector<HTMLElement>(`.field-seat[data-seat="${seat}"] .field-row`)!).borderLeftColor));
  expect(seatAccents[0]).not.toBe(seatAccents[1]);
  const rowCardGeometry = await page.locator('.field-row:not(.empty)').evaluateAll(rows => rows.map(row => {
    const rowBounds = row.getBoundingClientRect();
    const cardBounds = row.querySelector<HTMLElement>('.card')!.getBoundingClientRect();
    return { label: row.getAttribute('aria-label'), topGap: cardBounds.top - rowBounds.top,
      bottomGap: rowBounds.bottom - cardBounds.bottom };
  }));
  for (const row of rowCardGeometry) {
    expect(row.topGap, `${row.label} card clears its label`).toBeGreaterThanOrEqual(12);
    expect(row.bottomGap, `${row.label} card stays inside its row`).toBeGreaterThanOrEqual(0);
  }
  expect(rowCenters.opponentBackups.bottom, JSON.stringify(rowCenters)).toBeLessThanOrEqual(rowCenters.opponentForwards.top + 4);
  expect(rowCenters.playerForwards.bottom).toBeLessThanOrEqual(rowCenters.playerBackups.top + 4);
  expect(rowCenters.opponentForwards.bottom).toBeLessThanOrEqual(rowCenters.playerForwards.top + 6);
  expect(rowCenters.opponentZonesBottom).toBeLessThanOrEqual(rowCenters.opponentBackups.top + 2);
  if (rowCenters.opponentCommander) {
    expect(rowCenters.opponentCommander.top).toBeGreaterThanOrEqual(rowCenters.opponentSeat.top - 1);
    expect(rowCenters.opponentCommander.bottom).toBeLessThanOrEqual(rowCenters.opponentSeat.bottom + 1);
  }
  expect(rowCenters.battlefieldBottom).toBeLessThanOrEqual(rowCenters.handTop + 2);
  await page.getByRole('button', { name: /Inspect Player/ }).click();
  for (const seat of [1, 2]) {
    for (const type of ['Forwards', 'Backups']) await expect(page.getByRole('region', { name: `Player ${seat} ${type}`, exact: true })).toHaveCount(1);
  }
  const inspectedInstances = await page.locator('.table [data-table-instance]').evaluateAll(nodes =>
    nodes.map(node => (node as HTMLElement).dataset.tableInstance));
  expect(new Set(inspectedInstances).size).toBe(inspectedInstances.length);
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

test('stolen Forward follows its controller row and inspection preserves its owner', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('control-conflict');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  const borrowedBanner = page.locator('.hand-fan [data-card]').filter({ hasText: 'Borrowed Banner' });
  await borrowedBanner.click();
  await page.getByRole('button', { name: 'Review Summon · 4 CP', exact: true }).click();
  const target = page.locator('[aria-label="Player 1 Forwards"] [data-card]').filter({ hasText: 'Spark Runner' });
  await expect(target).toBeVisible();
  await target.click();
  await page.getByRole('button', { name: 'Confirm Summon · 4 CP', exact: true }).click();
  await expect(page.locator('.stack-row')).toContainText('Borrowed Banner');
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  const stolen = page.locator('[aria-label="Player 2 Forwards"] [data-card]').filter({ hasText: 'Spark Runner' });
  const rows = await page.locator('.field-row').evaluateAll(nodes => nodes.map(node => ({
    label: node.getAttribute('aria-label'), text: (node as HTMLElement).innerText,
  })));
  await expect(stolen, JSON.stringify(rows)).toBeVisible();
  await stolen.click();
  await expect(page.locator('.card-inspection-meta')).toContainText('Owner Player 1');
  await expect(page.locator('.card-inspection-meta')).toContainText('Controller Player 2');
});

test('Commander inspection shows zone, tax, readiness, printed power and rules text', async ({ page }) => {
  await start(page);
  const commander = page.locator('.own-zones [data-card]').first();
  await expect(commander).toBeVisible();
  await commander.click();
  const details = page.locator('.selected-preview');
  const inspectionFontSize = Number.parseFloat(await details.locator('.card-inspection-meta').evaluate(node => getComputedStyle(node).fontSize));
  expect(inspectionFontSize, 'Inspection metadata remains readable at desktop sizes').toBeGreaterThanOrEqual(10);
  await expect(details).toContainText('Commander');
  await expect(details.locator('.card-inspection-meta')).toContainText('commander');
  await expect(details.locator('.card-inspection-meta')).toContainText('Ready');
  await expect(details.locator('.card-inspection-meta')).toContainText('Commander tax 0 CP');
  await expect(details.locator('.card-inspection-meta')).toContainText('Keywords: Brave');
  await expect(details.locator('.card-inspection-meta')).toContainText('Printed');
  await expect(details.locator('.selection-detail')).not.toBeEmpty();
  await capture(page, test.info(), 'commander-inspection');
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

test('match log retains older events in its scrollable history', async ({ page }) => {
  await start(page);
  const log = page.locator('.event-log');
  const events = page.getByRole('log', { name: 'Game log' }).locator('li');
  expect(await events.count()).toBeGreaterThan(5);
  await events.last().scrollIntoViewIfNeeded();
  expect(await log.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await expect(events.last()).toBeVisible();
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
  expect.soft(await search.inputValue(), 'Filtering must retain input focus and all typed characters').toBe('Tide');
  await expect.soft(search).toBeFocused();
  const catalogRows = page.locator('.editor-columns section:last-child .editor-row');
  await expect(catalogRows.first()).toContainText(/Tide/i);
  await page.locator('#editor-type').selectOption('Summon');
  await expect(catalogRows.first()).toContainText('Summon');
  await expect(catalogRows).not.toHaveCount(0);
  await page.locator('#editor-element').selectOption('Water');
  await page.reload();
  await page.getByRole('button', { name: 'Deck editor', exact: true }).click();
  await expect(page.getByLabel('SEARCH', { exact: true })).toHaveValue('Tide');
  await expect(page.locator('#editor-type')).toHaveValue('Summon');
  await expect(page.locator('#editor-element')).toHaveValue('Water');
  const restoredRows = page.locator('.editor-columns section:last-child .editor-row');
  await expect(restoredRows).not.toHaveCount(0);
  await expect(restoredRows.first()).toContainText('Water');
  await expect(restoredRows.first()).toContainText('Summon');
});

test('deck editor exposes every legal Commander and explains invalid element changes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deck editor', exact: true }).click();
  const commander = page.locator('#editor-commander');
  const commanderIds = await commander.locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
  expect(commanderIds).toEqual(['P-001L', 'P-021L']);

  await commander.selectOption('P-021L');
  await expect(page.locator('.editor-error')).toContainText('does not share an element with the Commander');
  await expect(page.locator('.deck-count')).toHaveText('19 / 19');
  await expect(page.getByRole('button', { name: /Save for Player 1/ })).toBeDisabled();

  await commander.selectOption('P-001L');
  await expect(page.locator('.editor-error')).toHaveText('');
  await expect(page.getByRole('button', { name: /Save for Player 1/ })).toBeEnabled();
  const addQuartermaster = page.getByRole('button', { name: 'Add Quartermaster', exact: true });
  await expect(addQuartermaster).toBeDisabled();
  await page.getByRole('button', { name: 'Remove Quartermaster', exact: true }).click();
  await expect(page.locator('.deck-count')).toHaveText('18 / 19');
  await expect(addQuartermaster).toBeEnabled();
  await addQuartermaster.click();
  await expect(page.locator('.deck-count')).toHaveText('19 / 19');
});

test('deck editor inspects full card rules from both the catalog and deck list', async ({ page }, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deck editor', exact: true }).click();
  const catalog = page.locator('.editor-columns section:last-child');
  await catalog.getByRole('button', { name: 'Inspect Tide Warden', exact: true }).first().click();
  const inspector = page.getByRole('region', { name: 'Card inspection' });
  await expect(inspector).toContainText('Tide Warden');
  await expect(inspector).toContainText('P-021L');
  await expect(inspector).toContainText('7000');
  await expect(inspector).toContainText("Return it to its owner's hand.");
  await expect(inspector).toBeVisible();
  const bounds = await inspector.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
  await capture(page, info, 'editor-inspection-catalog');

  const mainDeck = page.locator('.editor-columns section:first-child');
  const firstDeckCard = await mainDeck.locator('.editor-row strong').first().textContent();
  expect(firstDeckCard).toBeTruthy();
  await mainDeck.getByRole('button', { name: `Inspect ${firstDeckCard}`, exact: true }).click();
  await expect(inspector).toContainText(firstDeckCard!);
  const keyboardInspect = mainDeck.getByRole('button', { name: `Inspect ${firstDeckCard}`, exact: true });
  await keyboardInspect.focus();
  await page.keyboard.press('Enter');
  await expect(inspector).toContainText(firstDeckCard!);
  await capture(page, info, 'editor-inspection-deck');
});

test('stack cards stay clear of the event log while a Commander destination choice is open', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('commander-removed-destination');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const commander = page.locator('[aria-label="Player 2 Forwards"] [data-card]').filter({ hasText: 'Tide Warden' });
  const summon = page.locator('[aria-label="Player 1 hand"] [data-card]').filter({ hasText: 'Controlled Burn' });
  await summon.click();
  await page.getByRole('button', { name: 'Review Summon · 3 CP', exact: true }).click();
  await page.getByRole('button', { name: 'Remove a Forward', exact: true }).click();
  await commander.click();
  await page.getByRole('button', { name: 'Confirm Summon · 3 CP', exact: true }).click();
  const stackDetails = page.getByRole('region', { name: 'Stack details' });
  const queuedStackEntry = stackDetails.getByRole('listitem').filter({ hasText: 'Controlled Burn' });
  await expect(queuedStackEntry).toContainText('Player 1');
  await expect(queuedStackEntry).toContainText('Tide Warden');
  await expect(queuedStackEntry).toHaveAttribute('data-resolving', 'false');
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Required choice' })).toContainText('Commander');
  await expect(page.locator('.stack-row [data-card]')).toHaveCount(1);
  const resolvingStackEntry = stackDetails.getByRole('listitem').filter({ hasText: 'Resolving Controlled Burn' });
  await expect(resolvingStackEntry).toContainText('Player 1');
  await expect(resolvingStackEntry).toHaveAttribute('data-resolving', 'true');
  const stackLogOverlap = await page.evaluate(() => {
    const log = document.querySelector<HTMLElement>('.event-log')!.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>('.stack-row [data-card]')].some(card => {
      const box = card.getBoundingClientRect();
      return box.left < log.right - 1 && box.right > log.left + 1 &&
        box.top < log.bottom - 1 && box.bottom > log.top + 1;
    });
  });
  expect(stackLogOverlap, 'The event log must not cover a card that is still on the stack').toBe(false);
  await capture(page, info, 'stack-state');
});

test('every queued End Phase trigger stays ordered and inspectable while the top trigger resolves', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('end-trigger-order');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();

  await page.locator('.hand-fan [data-card]').filter({ hasText: 'Rising Undertow' }).click();
  await page.getByRole('button', { name: 'Review Summon · 2 CP', exact: true }).click();
  const payment = page.getByRole('region', { name: 'Payment draft' });
  await payment.locator('[data-payment-source][aria-pressed="true"]').filter({ hasText: 'Mist Caller' }).click();
  const cast = page.getByRole('button', { name: 'Confirm Summon · 2 CP', exact: true });
  await expect(cast).toBeEnabled();
  await cast.click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();

  const order = page.getByRole('region', { name: 'Required choice' });
  await expect(order).toContainText('order');
  const options = page.locator('[data-order-choice]');
  await options.filter({ hasText: 'Rising Undertow' }).click();
  await options.filter({ hasText: 'Mist Caller' }).click();
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click();

  const target = page.locator('[data-choice]').filter({ hasText: 'River Recruit' });
  await expect(target).toBeVisible();
  const sequenceBeforeTarget = Number(await page.locator('.table').getAttribute('data-view-seq'));
  await target.click();
  await expect.poll(async () => Number(await page.locator('.table').getAttribute('data-view-seq')))
    .toBe(sequenceBeforeTarget + 1);

  const stack = page.getByRole('region', { name: 'Stack details' });
  const entries = stack.getByRole('listitem');
  await expect(entries).toHaveCount(2);
  await expect(entries.nth(0)).toContainText('2. Rising Undertow');
  await expect(entries.nth(0)).toContainText('Player 2');
  await expect(entries.nth(0)).toContainText('Targets: None');
  await expect(entries.nth(0)).toHaveAttribute('data-resolving', 'false');
  await expect(entries.nth(1)).toContainText('1. Mist Caller');
  await expect(entries.nth(1)).toContainText('Player 2');
  await expect(entries.nth(1)).toContainText('River Recruit');
  await expect(entries.nth(1)).toHaveAttribute('data-resolving', 'false');
  const activity = page.getByRole('region', { name: 'Game activity' });
  await entries.nth(1).scrollIntoViewIfNeeded();
  await expect.poll(() => activity.evaluate(element => element.scrollTop > 0)).toBe(true);
  const lastEntryFits = await entries.nth(1).evaluate(entry => {
    const panel = entry.closest<HTMLElement>('.event-log')!.getBoundingClientRect();
    const bounds = entry.getBoundingClientRect();
    return bounds.top >= panel.top && bounds.bottom <= panel.bottom;
  });
  expect(lastEntryFits, 'The later stack item must be reachable inside the scrollable activity panel').toBe(true);
  await capture(page, info, 'stack-two-triggers');

  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await expect(entries).toHaveCount(1);
  await expect(entries.nth(0)).toContainText('1. Rising Undertow');
  await expect(entries.nth(0)).toContainText('Player 2');
  await expect(entries.nth(0)).toHaveAttribute('data-resolving', 'false');
  await expect(page.locator('[aria-label="Player 2 Forwards"] [data-card]').filter({ hasText: 'River Recruit' }))
    .not.toHaveClass(/dull/);
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
  const optionFit = await choicePanel.locator('.choice-options').evaluate(node => {
    const viewport = node.getBoundingClientRect();
    const buttons = [...node.querySelectorAll<HTMLButtonElement>('[data-order-choice]')];
    return buttons.every(button => {
      const bounds = button.getBoundingClientRect();
      return bounds.left >= viewport.left - 1 && bounds.right <= viewport.right + 1;
    });
  });
  expect(optionFit, 'All five initial mulligan choices fit before the Clear and Confirm controls').toBe(true);
  expect.soft(await choicePanel.getByRole('button', { name: /Confirm/ }).count(),
    'A mandatory multi-card decision needs a Confirm control').toBe(1);
  const sequenceBefore = await page.locator('.table').getAttribute('data-view-seq');
  expect(sequenceBefore).not.toBeNull();
  await page.getByRole('button', { name: /Inspect Player/ }).click();
  await expect(choicePanel).toContainText('Player 1 is making a private choice');
  await page.getByRole('button', { name: /Inspect Player/ }).click();
  await expect(choicePanel).toContainText('Choose order 0/5');
  const options = page.locator('[data-order-choice]');
  await options.nth(0).click();
  await expect(options.nth(0)).toContainText('1.');
  await expect(page.getByRole('button', { name: 'Confirm order' })).toBeDisabled();
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', sequenceBefore!);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Required choice' })).toContainText('Choose order 0/5');
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', sequenceBefore!);
  const reloadedOptions = page.locator('[data-order-choice]');
  await reloadedOptions.nth(0).click();
  await expect(reloadedOptions.nth(0)).toContainText('1.');
  await expect(page.getByRole('button', { name: 'Confirm order' })).toBeDisabled();
  await reloadedOptions.nth(1).click();
  await expect(reloadedOptions.nth(1)).toContainText('2.');
  await reloadedOptions.nth(0).click();
  await expect(reloadedOptions.nth(0)).not.toContainText('1.');
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', sequenceBefore!);
  await reloadedOptions.nth(1).click();
  await expect(choicePanel).toContainText('Choose order 0/5');
  for (let index = 0; index < 5; index += 1) await reloadedOptions.nth(index).click();
  await expect(page.getByRole('button', { name: 'Confirm order' })).toBeEnabled();
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', sequenceBefore!);
  await page.getByRole('button', { name: 'Confirm order' }).click();
  await expect.poll(async () => Number(await page.locator('.table').getAttribute('data-view-seq'))).toBeGreaterThan(Number(sequenceBefore));
  await expect(choicePanel).toContainText('Keep your opening hand or redraw it once.');
});

test('Escape cannot dismiss a required starting-player choice', async ({ page }) => {
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  const choice = page.getByRole('button', { name: 'Take first turn', exact: true });
  await expect(choice).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(choice).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take second turn', exact: true })).toBeVisible();
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
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  const allocation = page.getByRole('region', { name: 'Required choice' });
  await expect(allocation).toContainText('Assign the blocking Forward');
  const amounts = allocation.locator('[data-allocation]');
  await expect(amounts).toHaveCount(2);
  const sequenceBeforeAllocation = await page.locator('.table').getAttribute('data-view-seq');
  await amounts.nth(0).fill('1000');
  await amounts.nth(1).fill('2000');
  await expect(page.locator('#confirm-allocation')).toBeEnabled();
  expect(await page.locator('.table').getAttribute('data-view-seq')).toBe(sequenceBeforeAllocation);
  await capture(page, info, 'party-allocation');
  await page.getByRole('button', { name: 'Confirm allocation' }).click();
  await expect(allocation).toHaveCount(0);
  await expect(page.locator('.event-log')).toContainText('combat damage');
});

test('defender can decline a block and resolve an unblocked attack', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('party-first-strike');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  const attacker = page.locator('[aria-label="Player 2 Forwards"] [data-card]').first();
  await attacker.click();
  await page.getByRole('button', { name: 'Add to attack party' }).click();
  await page.getByRole('button', { name: 'Attack with 1 Forward' }).click();
  for (let pass = 0; pass < 5; pass += 1) {
    await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  }
  await expect(page.locator('.event-log')).toContainText('Player 1 took damage.');
  await expect(page.locator('.player-row').filter({ hasText: 'Player 1' }).locator('.damage')).toContainText('1');
});

test('First Strike Forward removes its blocker through the combat controls', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('party-first-strike');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  const firstStrikeForward = page.locator('[aria-label="Player 2 Forwards"] [data-card]')
    .filter({ hasText: 'P-026R' });
  await expect(firstStrikeForward).toHaveCount(1);
  await firstStrikeForward.click();
  await page.getByRole('button', { name: 'Add to attack party' }).click();
  await page.getByRole('button', { name: 'Attack with 1 Forward' }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();

  const blocker = page.locator('[aria-label="Player 1 Forwards"] [data-card]');
  await expect(blocker).toHaveCount(1);
  await blocker.click();
  await page.getByRole('button', { name: 'Block this attack' }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();

  await expect(page.locator('[aria-label="Player 1 Forwards"] [data-card]')).toHaveCount(0);
  await expect(page.locator('[aria-label="Player 2 Forwards"] [data-card]').filter({ hasText: 'P-026R' })).toHaveCount(1);
  await expect(page.locator('.player-row').filter({ hasText: 'Player 1' }).locator('.damage')).toContainText('0');
});

test('selected-card actions fit the footer and use equal peer button heights', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('party-first-strike');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  const card = page.locator('[aria-label="Player 2 Forwards"] [data-card]').first();
  await card.click();
  await expect(page.locator('.card-inspection-meta')).toContainText('Owner Player 2');
  await expect(page.locator('.card-inspection-meta')).toContainText('Controller Player 2');
  await expect(page.locator('#toggle-party-member')).toBeVisible();
  await page.locator('#toggle-party-member').click();
  await capture(page, info, 'selected-actions');
  const geometry = await page.locator('.selected-preview button').evaluateAll(nodes => {
    const footer = document.querySelector('.bottom-bar')!.getBoundingClientRect();
    const rects = nodes.map(node => node.getBoundingClientRect());
    return { heights: rects.map(rect => rect.height), footer: { top: footer.top, bottom: footer.bottom },
      buttons: rects.map(rect => ({ top: rect.top, bottom: rect.bottom })),
      outside: rects.some(rect => rect.top < footer.top || rect.bottom > footer.bottom),
      occluded: nodes.some(node => {
        const r = node.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !hit || !node.contains(hit);
      }) };
  });
  expect.soft(geometry.outside, `Card actions fit their reserved footer area: ${JSON.stringify(geometry)}`).toBe(false);
  expect.soft(geometry.occluded, 'Card actions receive pointer input').toBe(false);
  expect.soft(Math.max(...geometry.heights) - Math.min(...geometry.heights), 'Peer card actions use equal heights').toBeLessThanOrEqual(1);
});
