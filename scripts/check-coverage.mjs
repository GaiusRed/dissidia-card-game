import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const catalogPath = resolve(root, 'src/content/opus-ph.ts');
const decksPath = resolve(root, 'src/content/decks.ts');
const coveragePath = resolve(root, 'docs/rules-coverage.md');
const catalog = readFileSync(catalogPath, 'utf8');
const decks = readFileSync(decksPath, 'utf8');
const coverage = readFileSync(coveragePath, 'utf8');
const errors = [];

const cardNumbers = [...catalog.matchAll(/card\('(P-\d{3}[CRHL])'/g)].map(match => match[1]);
const expectedNumbers = Array.from({ length: 40 }, (_, index) => `P-${String(index + 1).padStart(3, '0')}`);
if (new Set(cardNumbers).size !== 40 || cardNumbers.length !== 40) errors.push(`Expected 40 unique catalog definitions; found ${cardNumbers.length}.`);
if (expectedNumbers.some(number => !cardNumbers.some(card => card.startsWith(number)))) errors.push('Catalog is missing one or more P-001–P-040 card numbers.');

const mainLists = [...decks.matchAll(/main:\s*\[([^\]]*)\]/g)].map(match => [...match[1].matchAll(/'([^']+)'/g)].map(item => item[1]));
if (mainLists.length !== 2) errors.push(`Expected two preset main decks; found ${mainLists.length}.`);
for (const [index, list] of mainLists.entries()) {
  if (list.length !== 19 || new Set(list).size !== 19) errors.push(`Preset ${index + 1} must contain 19 unique main-deck cards.`);
  for (const number of list) if (!cardNumbers.includes(number)) errors.push(`Preset ${index + 1} refers to unknown card ${number}.`);
}

const testPaths = [...coverage.matchAll(/`(tests\/[a-zA-Z0-9_./-]+\.test\.ts|tests\/[a-zA-Z0-9_./-]+\.spec\.ts)`/g)].map(match => match[1]);
for (const testPath of new Set(testPaths)) {
  if (!existsSync(resolve(root, testPath))) errors.push(`Coverage report refers to missing test: ${testPath}.`);
}

const summonHandlers = [...catalog.matchAll(/summonHandler:\s*'([^']+)'/g)].map(match => match[1]);
const supportedBlock = readFileSync(resolve(root, 'src/rules/casting.ts'), 'utf8').match(/const supported = new Set\(\[([\s\S]*?)\]\);/);
const supportedSummons = [...(supportedBlock?.[1] ?? '').matchAll(/'([^']+)'/g)].map(match => match[1]);
const pendingSummons = [...new Set(summonHandlers)].filter(handler => !supportedSummons.includes(handler));

if (errors.length) {
  for (const error of errors) console.error(`Coverage check failed: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Catalog structure: ${cardNumbers.length} cards; ${mainLists.length} preset decks of 19 singleton cards.`);
  console.log(`Traceability: ${new Set(testPaths).size} linked test files exist.`);
  if (pendingSummons.length) console.log(`Behavior coverage remains partial; unsupported Summon handlers: ${pendingSummons.join(', ')}.`);
  console.log('See docs/rules-coverage.md for the current rule and behavior status.');
}
