import { describe, expect, it } from 'vitest';
import { projectView } from '../../src/host/views';
import { MatchController } from '../../src/client/match-controller';
import { fixture, context } from '../support/harness';

describe('projected match controller', () => {
  it('changes inspection seat without changing the required decision actor', () => {
    const state = fixture({}).state;
    state.choice = { id: 'required-choice', seat: 0, kind: 'confirm', reason: 'Choose.',
      options: [{ id: 'yes', label: 'Yes', object: null }], min: 1, max: 1, allocation: null,
      resume: { handler: 'test', step: 'answer', data: null } };
    state.priority = null;
    const controller = new MatchController(projectView(state, 0, [], context, 1));

    controller.inspectSeat(1);

    expect(controller.inspectedSeat).toBe(1);
    expect(controller.view.decisionSeat).toBe(0);
    expect(controller.view.choice?.id).toBe('required-choice');
  });

  it('clears a draft with a visible explanation when the view authority changes', () => {
    const state = fixture({}).state;
    state.choice = null;
    const controller = new MatchController(projectView(state, 0, [], context, 4));
    controller.beginDraft({ kind: 'action', id: 'cast-forward' });

    const changed = { ...projectView(state, 0, [], context, 4), seq: state.seq + 1 };
    controller.acceptView(changed);

    expect(controller.draft).toBeNull();
    expect(controller.explanation).toMatch(/game state changed/i);
  });

  it('keeps a draft during inspection but clears it when the projected decision actor changes', () => {
    const state = fixture({}).state;
    state.choice = null;
    const view = projectView(state, 0, [], context, 5);
    const controller = new MatchController(view);
    const draft = { kind: 'action' as const, id: 'cast-forward' };
    controller.beginDraft(draft);

    controller.inspectSeat(1);
    expect(controller.draft).toEqual(draft);
    controller.acceptView({ ...view, decisionSeat: 1 });

    expect(controller.draft).toBeNull();
    expect(controller.explanation).toMatch(/game state changed/i);
  });

  it('keeps a draft while the same projected authority is refreshed', () => {
    const state = fixture({}).state;
    state.choice = null;
    const view = projectView(state, 0, [], context, 7);
    const controller = new MatchController(view);
    const draft = { kind: 'action' as const, id: 'cast-forward' };
    controller.beginDraft(draft);

    controller.acceptView({ ...view });

    expect(controller.draft).toEqual(draft);
    expect(controller.explanation).toBeNull();
  });

  it('clears drafts when match generation or required choice identity changes', () => {
    const state = fixture({}).state;
    state.choice = { id: 'choice-before', seat: 0, kind: 'confirm', reason: 'Choose.',
      options: [{ id: 'yes', label: 'Yes', object: null }], min: 1, max: 1, allocation: null,
      resume: { handler: 'test', step: 'answer', data: null } };
    state.priority = null;
    const initial = projectView(state, 0, [], context, 8);
    const controller = new MatchController(initial);
    controller.beginDraft({ kind: 'choice', id: 'choice-before' });

    controller.acceptView({ ...initial, generation: 9 });
    expect(controller.draft).toBeNull();
    controller.beginDraft({ kind: 'choice', id: 'choice-before' });
    controller.acceptView({ ...initial, choice: { ...initial.choice!, id: 'choice-after' } });
    expect(controller.draft).toBeNull();
    expect(controller.explanation).toMatch(/game state changed/i);
  });
});
