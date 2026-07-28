import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  makeMutable,
  runOnJS,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useFrameLoop } from './useFrameLoop';

import {
  AIRTIME,
  BAR_H,
  BAR_W,
  BAR_Y,
  GRAVITY,
  GROUND_FRAC,
  JUMP_V,
  MODES,
  PLAYER_SIZE,
  PLAYER_X_FRAC,
  POOL,
  SPIKE_H,
  SPIKE_W,
} from './config';
import type { ModeId, Trial } from '../types';

export type Slot = {
  /** screen x of the obstacle's left edge */
  x: SharedValue<number>;
  /** 0 = idle, 1 = spike (go), 2 = bar (no-go) */
  kind: SharedValue<number>;
  /** 0 until it pops into view, then 1. drives opacity. */
  vis: SharedValue<number>;
  /** engine clock reading at the moment vis flipped to 1 */
  revealTs: SharedValue<number>;
  /** 1 once the player has committed a response to this obstacle */
  answered: SharedValue<number>;
};

export type EngineHandlers = {
  onTrial: (t: Trial) => void;
  /** tapped before the next obstacle was even visible */
  onFalseStart: () => void;
  /** let a no-go bar pass without jumping - the correct thing to do */
  onCorrectReject: () => void;
  onDeath: (by: 'spike' | 'bar') => void;
};

export type Engine = ReturnType<typeof useEngine>;

export function useEngine(mode: ModeId, W: number, H: number, handlers: EngineHandlers) {
  const cfg = MODES[mode];

  const GROUND_Y = H * GROUND_FRAC;
  const PX = W * PLAYER_X_FRAC;
  /** the longest lead we can actually show - past this an obstacle is off-screen */
  const MAX_REVEAL = W - PX - 10;

  // Handlers change identity every render; runOnJS targets must not. Route
  // everything through a ref so the worklets can hold stable references.
  const hRef = useRef(handlers);
  hRef.current = handlers;

  const emitTrial = useCallback((rt: number, kind: number, correct: boolean) => {
    hRef.current.onTrial({ rt, kind: kind === 2 ? 2 : 1, correct });
  }, []);
  const emitFalseStart = useCallback(() => hRef.current.onFalseStart(), []);
  const emitCorrectReject = useCallback(() => hRef.current.onCorrectReject(), []);
  const emitDeath = useCallback((by: number) => {
    hRef.current.onDeath(by === 2 ? 'bar' : 'spike');
  }, []);

  // Fixed pool. Obstacles are recycled, never allocated mid-run, so the render
  // tree is static and the loop does zero allocation per frame.
  const slots = useMemo<Slot[]>(
    () =>
      Array.from({ length: POOL }, () => ({
        x: makeMutable(-9999),
        kind: makeMutable(0),
        vis: makeMutable(0),
        revealTs: makeMutable(0),
        answered: makeMutable(0),
      })),
    []
  );

  const running = useSharedValue(0);
  const clock = useSharedValue(0); // ms since the run started

  const playerY = useSharedValue(0); // px above ground
  const playerV = useSharedValue(0);
  const grounded = useSharedValue(1);
  const rot = useSharedValue(0);

  const speed = useSharedValue(cfg.speed0);
  const topSpeed = useSharedValue(cfg.speed0);
  const dist = useSharedValue(0);
  const cleared = useSharedValue(0);
  const reveal = useSharedValue(Math.min((cfg.warnStart / 1000) * cfg.speed0, MAX_REVEAL));
  const spawnIn = useSharedValue(0); // world px until the next spawn

  const shake = useSharedValue(0);
  const flash = useSharedValue(0);
  const lastRt = useSharedValue(0);

  const reset = useCallback(() => {
    running.value = 0;
    clock.value = 0;
    playerY.value = 0;
    playerV.value = 0;
    grounded.value = 1;
    rot.value = 0;
    speed.value = cfg.speed0;
    topSpeed.value = cfg.speed0;
    dist.value = 0;
    cleared.value = 0;
    reveal.value = Math.min((cfg.warnStart / 1000) * cfg.speed0, MAX_REVEAL);
    // first obstacle gets a generous run-up so the run never opens unfairly
    spawnIn.value = W * 0.9;
    shake.value = 0;
    flash.value = 0;
    lastRt.value = 0;
    for (const s of slots) {
      s.kind.value = 0;
      s.x.value = -9999;
      s.vis.value = 0;
      s.answered.value = 0;
      s.revealTs.value = 0;
    }
  }, [cfg, W, slots]);

  const start = useCallback(() => {
    reset();
    running.value = 1;
  }, [reset]);

  const stop = useCallback(() => {
    running.value = 0;
  }, []);

  const die = useCallback((kind: number) => {
    'worklet';
    if (running.value === 0) return;
    running.value = 0;
    flash.value = withSequence(withTiming(1, { duration: 40 }), withTiming(0, { duration: 420 }));
    shake.value = withSequence(
      withTiming(14, { duration: 45 }),
      withTiming(-10, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 90 })
    );
    runOnJS(emitDeath)(kind);
  }, [emitDeath]);

  const step = useCallback((dtMs: number) => {
    'worklet';
    if (running.value === 0) return;

    // Clamp dt. A dropped frame must not teleport the player through a spike.
    const dt = Math.min(dtMs, 50) / 1000;
    clock.value += dt * 1000;

    if (cfg.accel > 0) {
      speed.value = Math.min(cfg.speedMax, speed.value + cfg.accel * dt);
      if (speed.value > topSpeed.value) topSpeed.value = speed.value;
    }
    const dx = speed.value * dt;
    dist.value += dx;

    const ramp = Math.min(1, cleared.value / cfg.warnRamp);
    const warnMs = cfg.warnStart + (cfg.warnEnd - cfg.warnStart) * ramp;
    reveal.value = Math.min((warnMs / 1000) * speed.value, MAX_REVEAL);

    // --- player -----------------------------------------------------------
    if (grounded.value === 0) {
      playerV.value -= GRAVITY * dt;
      playerY.value += playerV.value * dt;
      rot.value += (360 / AIRTIME) * dt;
      if (playerY.value <= 0) {
        playerY.value = 0;
        playerV.value = 0;
        grounded.value = 1;
        rot.value = Math.round(rot.value / 90) * 90; // land square
      }
    }

    // --- spawn ------------------------------------------------------------
    spawnIn.value -= dx;
    if (spawnIn.value <= 0) {
      let free = -1;
      for (let i = 0; i < POOL; i++) {
        if (slots[i].kind.value === 0) {
          free = i;
          break;
        }
      }
      if (free >= 0) {
        const s = slots[free];
        const isBar = cfg.barChance > 0 && Math.random() < cfg.barChance;
        s.kind.value = isBar ? 2 : 1;
        s.x.value = W + 20;
        s.answered.value = 0;
        // Fully clamped means the mode wants more lead than the track has, so
        // the obstacle is simply visible from the moment it exists.
        if (reveal.value >= MAX_REVEAL) {
          s.vis.value = 1;
          s.revealTs.value = clock.value;
        } else {
          s.vis.value = 0;
          s.revealTs.value = 0;
        }
      }
      // Never spawn closer than one full jump apart, or the run becomes
      // unclearable rather than hard.
      const floor = AIRTIME * speed.value + 60;
      const gapMin = Math.max(cfg.gapMin, floor);
      const gapMax = Math.max(cfg.gapMax, gapMin + 120);
      spawnIn.value = gapMin + Math.random() * (gapMax - gapMin);
    }

    // --- obstacles --------------------------------------------------------
    for (let i = 0; i < POOL; i++) {
      const s = slots[i];
      const k = s.kind.value;
      if (k === 0) continue;

      s.x.value -= dx;

      const ow = k === 1 ? SPIKE_W : BAR_W;
      const oy = k === 1 ? 0 : BAR_Y;
      const oh = k === 1 ? SPIKE_H : BAR_H;

      if (s.vis.value === 0 && s.x.value - PX <= reveal.value) {
        s.vis.value = 1;
        s.revealTs.value = clock.value;
      }

      // AABB against the player
      if (s.x.value < PX + PLAYER_SIZE && s.x.value + ow > PX) {
        if (playerY.value < oy + oh && playerY.value + PLAYER_SIZE > oy) {
          die(k);
          return;
        }
      }

      // fully past the player
      if (s.x.value + ow < PX) {
        cleared.value += 1;
        if (k === 2 && s.answered.value === 0) runOnJS(emitCorrectReject)();
        s.kind.value = 0;
        s.x.value = -9999;
        s.vis.value = 0;
      }
    }
  }, [cfg, W, PX, MAX_REVEAL, slots, die, emitCorrectReject]);

  useFrameLoop(step);

  /** Called from the tap gesture. Already on the UI thread. */
  const tap = useCallback(() => {
    'worklet';
    if (running.value === 0) return;
    if (grounded.value === 0) return; // no double jump, and no ambiguous attribution

    // Attribute the tap to the nearest obstacle the player has not answered yet.
    let bestI = -1;
    let bestX = Infinity;
    for (let i = 0; i < POOL; i++) {
      const s = slots[i];
      const k = s.kind.value;
      if (k === 0 || s.answered.value === 1) continue;
      const ow = k === 1 ? SPIKE_W : BAR_W;
      if (s.x.value + ow > PX && s.x.value < bestX) {
        bestX = s.x.value;
        bestI = i;
      }
    }

    if (bestI >= 0) {
      const s = slots[bestI];
      s.answered.value = 1;
      if (s.vis.value === 1) {
        const rt = clock.value - s.revealTs.value;
        lastRt.value = rt;
        const kind = s.kind.value;
        runOnJS(emitTrial)(rt, kind, kind === 1);

        // Responding to a no-go bar ends the run there and then, rather than
        // waiting to see whether the jump happens to collide.
        //
        // Physically an early jump clears a bar - you land before it arrives -
        // so collision alone leaves the impulsive tap completely unpunished,
        // which is the exact error this mode exists to train out. In a go/no-go
        // task, responding to the no-go stimulus IS the failure, whatever the
        // geometry does afterwards.
        if (kind === 2) {
          die(2);
          return;
        }
      } else {
        // jumped at something they could not possibly have seen yet
        runOnJS(emitFalseStart)();
      }
    }

    grounded.value = 0;
    playerV.value = JUMP_V;
  }, [slots, PX, emitTrial, emitFalseStart, die]);

  // Mount only. `reset` changes identity whenever the window does, and a
  // rotation or a resize mid-run must not silently zero the run out.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => reset(), []);

  return {
    cfg,
    slots,
    GROUND_Y,
    PX,
    running,
    playerY,
    grounded,
    rot,
    speed,
    topSpeed,
    dist,
    cleared,
    reveal,
    shake,
    flash,
    lastRt,
    clock,
    start,
    stop,
    reset,
    tap,
    /** exposed so the simulation can be driven deterministically in tests */
    step,
  };
}
