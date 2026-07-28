import { ModeId } from '../types';

// ---------------------------------------------------------------------------
// World geometry. All Y values are "px above the ground line", so 0 = grounded.
// ---------------------------------------------------------------------------

export const PLAYER_SIZE = 34;
/** how far from the left edge the player sits, as a fraction of screen width */
export const PLAYER_X_FRAC = 0.2;
/** ground line as a fraction of screen height */
export const GROUND_FRAC = 0.72;

export const GRAVITY = 2600; // px/s^2
export const JUMP_V = 900; // px/s
// apex  = JUMP_V / GRAVITY            = 0.346 s
// height= JUMP_V^2 / (2 * GRAVITY)    = 156 px
// airtime                             = 0.692 s
export const AIRTIME = (2 * JUMP_V) / GRAVITY;

export const SPIKE_W = 30;
export const SPIKE_H = 52;

export const BAR_W = 34;
export const BAR_H = 60;
/** bar floats this high, leaving a gap the grounded player fits through */
export const BAR_Y = 46;

/** obstacle slots recycled by the engine. never allocate during a run. */
export const POOL = 16;

/** world px per displayed metre */
export const PX_PER_M = 50;

export type ModeDef = {
  id: ModeId;
  name: string;
  tagline: string;
  blurb: string;
  /** what the mode actually trains, shown on the results screen */
  metric: 'distance' | 'reaction' | 'choice';
  speed0: number;
  /** px/s gained per second alive */
  accel: number;
  speedMax: number;
  /**
   * How much warning you get, in milliseconds, before an obstacle reaches you.
   * Shrinking this is what makes a mode harder.
   *
   * This is deliberately expressed in time rather than pixels. Pixels would
   * make the difficulty depend on screen width and on the current speed, and a
   * 375pt phone only has ~300pt of track ahead of the player - a "620px late
   * reveal" is not late at all there. Time is the thing being trained, so time
   * is the knob. The engine converts to px against the current speed and
   * clamps to the track that actually exists.
   *
   * Usable reaction window is roughly warn minus the ~70ms of jump you can
   * shave off the very end and still clear a spike.
   */
  warnStart: number;
  warnEnd: number;
  /** obstacles cleared before warn reaches warnEnd */
  warnRamp: number;
  /** probability an obstacle is a no-go bar */
  barChance: number;
  /** spacing between obstacles, in px, randomised every spawn */
  gapMin: number;
  gapMax: number;
};

// A note on gaps: they are randomised on purpose. Fixed spacing turns any
// runner into a rhythm game you can memorise, which is the exact thing that
// stops it training reaction.

export const MODES: Record<ModeId, ModeDef> = {
  flow: {
    id: 'flow',
    name: 'FLOW',
    tagline: 'endless, everything visible',
    blurb:
      'Obstacles are visible the whole way in and the track keeps accelerating. This is the warm-up and the fun run - it trains timing, not reaction.',
    metric: 'distance',
    speed0: 400,
    accel: 15,
    speedMax: 950,
    // effectively infinite - always clamps to the full track, so obstacles are
    // on screen the whole way in
    warnStart: 99999,
    warnEnd: 99999,
    warnRamp: 1,
    barChance: 0,
    gapMin: 360,
    gapMax: 640,
  },
  blind: {
    id: 'blind',
    name: 'BLIND',
    tagline: 'late reveal, pure reaction',
    blurb:
      'Spikes pop into view with almost no warning and the warning shrinks as you survive. Nothing to memorise - this is a straight visual reaction test with a jump attached.',
    metric: 'reaction',
    // slower than Flow on purpose: a slower track buys more warning time on a
    // narrow screen, and warning time is the difficulty knob here
    speed0: 400,
    accel: 0,
    speedMax: 400,
    warnStart: 680,
    warnEnd: 330,
    warnRamp: 40,
    barChance: 0,
    gapMin: 420,
    gapMax: 800,
  },
  gate: {
    id: 'gate',
    name: 'GATE',
    tagline: 'go / no-go, punishes itchy fingers',
    blurb:
      'Red spike means jump. Blue bar means hold - jumping into it kills you. You have to identify before you act, which is the part that actually carries over to trigger discipline.',
    metric: 'choice',
    // choice reaction is slower than simple reaction, so this gets more warning
    // and a slower track to fit it in
    speed0: 380,
    accel: 0,
    speedMax: 380,
    warnStart: 750,
    warnEnd: 430,
    warnRamp: 40,
    barChance: 0.4,
    gapMin: 460,
    gapMax: 840,
  },
};

export const MODE_ORDER: ModeId[] = ['blind', 'gate', 'flow'];
