import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const cardsPath = resolve(root, 'src/content/cards/opus-ph');
const decksPath = resolve(root, 'src/content/decks.ts');
const coveragePath = resolve(root, 'docs/rules-coverage.md');
const decks = readFileSync(decksPath, 'utf8');
const coverage = readFileSync(coveragePath, 'utf8');
const errors = [];

const modules = readdirSync(cardsPath).filter(name => /^P-\d{3}[CRHL]\.ts$/.test(name));
const cardSources = modules.map(file => [file, readFileSync(resolve(cardsPath, file), 'utf8')]);
const cardNumbers = cardSources.map(([, source]) => source.match(/["']?number["']?\s*:\s*["'](P-\d{3}[CRHL])["']/)?.[1]).filter(Boolean);
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

for (const [file, source] of cardSources) {
  if (!source.includes('export default card')) errors.push(`Card module ${file} does not export its definition.`);
  const hasScriptReference = value => source.split(value).length - 1 > 1;
  const executableAbilities = [...source.matchAll(/"kind":\s*"(action|special|auto)"[\s\S]*?"handler":\s*"([^"]+)"/g)];
  for (const [, kind, handler] of executableAbilities) {
    if (!hasScriptReference(handler)) {
      errors.push(`Card module ${file} does not register its ${kind} script ${handler}.`);
    }
  }
  const summon = source.match(/"summonHandler":\s*"([^"]+)"/)?.[1];
  if (summon && !hasScriptReference(summon)) {
    errors.push(`Card module ${file} does not register its Summon script ${summon}.`);
  }
  const exHandler = source.match(/"exHandler":\s*"([^"]+)"/)?.[1];
  if (exHandler && !hasScriptReference(exHandler)) {
    errors.push(`Card module ${file} does not register its EX Burst script ${exHandler}.`);
  }
  if (source.includes('"kind": "field"') && !/fieldEffects:\s*\[\s*\{[\s\S]*?effects:/.test(source)) {
    errors.push(`Card module ${file} has a field ability without a power provider.`);
  }
  if (source.includes('"kind": "replacement"') && !/replacements:\s*\[\s*\{[\s\S]*?propose:/.test(source)) {
    errors.push(`Card module ${file} has a replacement ability without a damage provider.`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`Coverage check failed: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Catalog structure: ${cardNumbers.length} cards; ${mainLists.length} preset decks of 19 singleton cards.`);
  console.log(`Traceability: ${new Set(testPaths).size} linked test files exist.`);
  console.log(`Card modules: ${modules.length} separate TypeScript files in the explicit Opus PH set.`);
  console.log('See docs/rules-coverage.md for the current rule and behavior status.');
}
