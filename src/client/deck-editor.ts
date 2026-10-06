import { opusPh } from '../content/opus-ph';
import { mvpFormat, validateDeck } from '../rules/format';
import type { CardNumber, DeckList, RuleError } from '../rules/types';

export function createDeckEditor(deck: DeckList): DeckList { return { commander: deck.commander, main: [...deck.main] }; }
export function addEditorCard(deck: DeckList, number: CardNumber): RuleError[] {
  if (deck.main.includes(number)) return [{ code: 'DUPLICATE_CARD', message: `${number} is already in this deck.` }];
  if (deck.main.length >= mvpFormat.mainSize) return [{ code: 'DECK_FULL', message: 'The main deck already has 19 cards.' }];
  const next = { ...deck, main: [...deck.main, number] };
  return validateDeck(next, mvpFormat, opusPh).filter(error => error.code !== 'WRONG_DECK_SIZE');
}
export function removeEditorCard(deck: DeckList, number: CardNumber): DeckList {
  return { ...deck, main: deck.main.filter(item => item !== number) };
}
export function changeEditorCommander(deck: DeckList, number: CardNumber): RuleError[] {
  return validateDeck({ ...deck, commander: number }, mvpFormat, opusPh).filter(error => error.code !== 'WRONG_DECK_SIZE');
}
export function editorValidation(deck: DeckList): RuleError[] { return validateDeck(deck, mvpFormat, opusPh); }
