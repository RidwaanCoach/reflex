import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useFrameCallback } from 'react-native-reanimated';

const IS_WEB = Platform.OS === 'web';

/**
 * Per-frame driver.
 *
 * On native this is Reanimated's frame callback, so the whole game loop runs on
 * the UI thread and a busy JS thread cannot stutter it - which matters here
 * because JS-thread jitter would land straight in the reaction numbers.
 *
 * Reanimated's frame callback registry is never initialised on web (it is
 * scheduled onto a UI runtime that does not exist there), so the callback would
 * silently never fire. Web falls back to requestAnimationFrame on the single
 * thread it has. Same `step`, both paths: on native babel turns it into a
 * worklet, on web it stays an ordinary function, and writing shared values
 * works either way.
 *
 * `step` must be stable - an inline arrow re-registers the callback on every
 * render, which tears down and restarts the underlying rAF loop.
 */
export function useFrameLoop(step: (dtMs: number) => void) {
  useFrameCallback((frame) => {
    'worklet';
    if (IS_WEB) return;
    step(frame.timeSincePreviousFrame ?? 16);
  });

  useEffect(() => {
    if (!IS_WEB) return;
    let raf = 0;
    let prev = 0;
    let cancelled = false;

    const loop = (t: number) => {
      if (cancelled) return;
      const dt = prev ? t - prev : 16;
      prev = t;
      step(dt);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [step]);
}
