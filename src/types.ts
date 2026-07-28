export type ModeId = 'flow' | 'blind' | 'gate';

/** One recorded response to one obstacle. */
export type Trial = {
  /** ms between the obstacle becoming visible and the player's tap */
  rt: number;
  /** 1 = spike (go), 2 = bar (no-go) */
  kind: 1 | 2;
  /** did the player do the right thing */
  correct: boolean;
};

export type RunRecord = {
  id: string;
  mode: ModeId;
  ts: number;
  cleared: number;
  /** world px travelled */
  distance: number;
  topSpeed: number;
  medianRt: number | null;
  bestRt: number | null;
  rtCount: number;
  falseAlarms: number;
  correctRejects: number;
  endedBy: 'spike' | 'bar';
};
