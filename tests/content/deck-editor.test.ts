import { describe, expect, it } from 'vitest';
import { addEditorCard, changeEditorCommander, createDeckEditor, editorValidation, removeEditorCard } from '../../src/client/deck-editor';
import { cinderCompany } from '../../src/content/decks';

describe('placeholder deck editor model', () => {
  it('adds and removes matching singleton cards without mutating the supplied deck', () => {
    const deck = createDeckEditor({ commander: cinderCompany.commander, main: cinderCompany.main.slice(0, 18) });
    expect(addEditorCard(deck, 'P-020H')).toEqual([]);
    expect(editorValidation({ ...deck, main: [...deck.main, 'P-020H'] })).toEqual([]);
    expect(removeEditorCard({ ...deck, main: [...deck.main, 'P-020H'] }, 'P-020H')).toEqual(deck);
    expect(deck.main).toHaveLength(18);
  });
  it('rejects duplicates and cards outside Commander element identity', () => {
    expect(addEditorCard(cinderCompany, 'P-002C').map(error => error.code)).toContain('DUPLICATE_CARD');
    const deck = { ...cinderCompany, main: cinderCompany.main.slice(0, 18) };
    expect(addEditorCard(deck, 'P-022C').map(error => error.code)).toContain('ELEMENT_MISMATCH');
    expect(changeEditorCommander(deck, 'P-022C').map(error => error.code)).toContain('INVALID_COMMANDER');
  });
});
