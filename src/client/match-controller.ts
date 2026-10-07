import type { Seat } from '../rules/types';
import type { MatchView } from '../host/protocol';

export interface LocalMatchDraft {
  kind: 'action' | 'choice';
  id: string;
}

/** Keeps local inspection and drafts separate from command authority in the projected host view. */
export class MatchController {
  private currentView: MatchView;
  private currentDraft: LocalMatchDraft | null = null;
  private currentInspection: Seat | null;
  private currentExplanation: string | null = null;

  constructor(view: MatchView) {
    this.currentView = view;
    this.currentInspection = view.decisionSeat ?? view.active;
  }

  get view(): MatchView { return this.currentView; }
  get draft(): LocalMatchDraft | null { return this.currentDraft; }
  get inspectedSeat(): Seat | null { return this.currentInspection; }
  get explanation(): string | null { return this.currentExplanation; }

  inspectSeat(seat: Seat | null): void {
    this.currentInspection = seat;
  }

  beginDraft(draft: LocalMatchDraft): void {
    this.currentDraft = { ...draft };
    this.currentExplanation = null;
  }

  clearDraft(explanation: string | null = null): void {
    this.currentDraft = null;
    this.currentExplanation = explanation;
  }

  acceptView(view: MatchView): void {
    const prior = this.currentView;
    const authorityChanged = prior.generation !== view.generation || prior.seq !== view.seq ||
      prior.decisionSeat !== view.decisionSeat || prior.choice?.id !== view.choice?.id;
    this.currentView = view;
    if (authorityChanged && this.currentDraft) {
      this.clearDraft('The game state changed. Your selection has been cleared.');
    }
  }
}
