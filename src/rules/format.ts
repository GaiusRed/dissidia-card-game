import type { CardDefinition, Catalog, DeckList, FormatProfile, RuleError } from './types';

export const mvpFormat: FormatProfile = { id: 'commander-duel-ph-v1', mainSize: 19, allowedSets: ['opus-ph'], damageLimit: 7 };
export const productionFormat: FormatProfile = { id: 'commander-duel-v1', mainSize: 49, allowedSets: ['opus-zero', 'opus-1', 'opus-2', 'opus-3'], damageLimit: 7 };

const error = (code: string, message: string): RuleError => ({ code, message });
const isColorless = (card: CardDefinition): boolean => card.elements.some(element => element === 'Light' || element === 'Dark');

export function validateDeck(deck: DeckList, format: FormatProfile, catalog: Catalog): RuleError[] {
  const errors: RuleError[] = [];
  if (deck.main.length !== format.mainSize) {
    errors.push(error('WRONG_DECK_SIZE', `This format requires exactly ${format.mainSize} main-deck cards.`));
  }
  const commander = catalog[deck.commander];
  if (!commander || commander.type !== 'Forward' || commander.rarity !== 'L') {
    errors.push(error('INVALID_COMMANDER', 'The Commander must be a Forward of Legend rarity.'));
  }
  const seen = new Set<string>();
  for (const number of [deck.commander, ...deck.main]) {
    if (seen.has(number)) errors.push(error('DUPLICATE_CARD', `Card number ${number} can appear only once, including the Commander.`));
    seen.add(number);
    const card = catalog[number];
    if (!card) {
      errors.push(error('UNKNOWN_CARD', `Card number ${number} is not in the selected catalog.`));
      continue;
    }
    if (!format.allowedSets.includes(card.set)) errors.push(error('SET_NOT_ALLOWED', `Card ${number} is not legal in this format.`));
  }
  if (commander) for (const number of deck.main) {
    const card = catalog[number];
    if (card && !isColorless(card) && !card.elements.some(element => commander.elements.includes(element))) {
      errors.push(error('ELEMENT_MISMATCH', `${number} does not share an element with the Commander.`));
    }
  }
  return errors;
}
