import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import Field from '../components/Field';
import { MODES, PX_PER_M } from '../game/config';
import { useEngine } from '../game/engine';
import { median } from '../storage';
import { C } from '../theme';
import type { ModeId, RunRecord, Trial } from '../types';

export default function GameScreen({
  mode,
  haptics,
  onEnd,
  onQuit,
}: {
  mode: ModeId;
  haptics: boolean;
  onEnd: (run: RunRecord) => void;
  onQuit: () => void;
}) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cfg = MODES[mode];

  const trials = useRef<Trial[]>([]);
  const falseStarts = useRef(0);
  const correctRejects = useRef(0);
  const ended = useRef(false);

  const [count, setCount] = useState(3);
  const [hud, setHud] = useState({ dist: 0, cleared: 0, rt: 0, speed: 0 });

  const finish = useCallback(
    (by: 'spike' | 'bar') => {
      if (ended.current) return;
      ended.current = true;

      // Flow reveals obstacles the moment they spawn off-screen, so its "reaction
      // times" are just spawn-to-tap intervals and mean nothing. Don't log them.
      const timed = cfg.metric !== 'distance';
      const rts = timed ? trials.current.filter((t) => t.correct).map((t) => t.rt) : [];
      onEnd({
        id: `${Date.now()}`,
        mode,
        ts: Date.now(),
        cleared: Math.round(engine.cleared.value),
        distance: Math.round(engine.dist.value),
        topSpeed: Math.round(engine.topSpeed.value),
        medianRt: rts.length ? Math.round(median(rts) as number) : null,
        bestRt: rts.length ? Math.round(Math.min(...rts)) : null,
        rtCount: rts.length,
        falseAlarms: trials.current.filter((t) => !t.correct).length + falseStarts.current,
        correctRejects: correctRejects.current,
        endedBy: by,
      });
    },
    [mode, cfg, onEnd]
  );

  const engine = useEngine(mode, W, H, {
    onTrial: (t) => trials.current.push(t),
    onFalseStart: () => {
      falseStarts.current += 1;
    },
    onCorrectReject: () => {
      correctRejects.current += 1;
    },
    onDeath: (by) => {
      if (haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      // let the death shake play before swapping screens
      setTimeout(() => finish(by), 620);
    },
  });

  // 3-2-1 in, then hand control over
  useEffect(() => {
    let n = 3;
    const id = setInterval(() => {
      n -= 1;
      setCount(n);
      if (n <= 0) {
        clearInterval(id);
        engine.start();
      }
    }, 620);
    return () => clearInterval(id);
  }, []);

  // HUD only. Polling from JS keeps the game loop free of React work.
  useEffect(() => {
    const id = setInterval(() => {
      setHud({
        dist: engine.dist.value,
        cleared: engine.cleared.value,
        rt: engine.lastRt.value,
        speed: engine.speed.value,
      });
    }, 110);
    return () => clearInterval(id);
  }, []);

  // Dev-only bridge so the simulation can be stepped by hand from a console.
  // The browser preview runs in a hidden tab, where requestAnimationFrame never
  // fires, so driving `step` directly is the only way to exercise the loop there.
  if (__DEV__) (globalThis as any).__reflex = { engine, trials, falseStarts, correctRejects };

  const buzz = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const gesture = Gesture.Tap()
    .maxDuration(100000)
    .onBegin(() => {
      'worklet';
      if (engine.running.value === 1 && engine.grounded.value === 1 && haptics) runOnJS(buzz)();
      engine.tap();
    });

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: engine.shake.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: engine.flash.value * 0.42 }));

  const showRt = cfg.metric !== 'distance';

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, shakeStyle]}>
          <Field
            slots={engine.slots}
            playerY={engine.playerY}
            rot={engine.rot}
            dist={engine.dist}
            reveal={engine.reveal}
            playerX={engine.PX}
            groundY={engine.GROUND_Y}
            showReveal={cfg.metric !== 'distance'}
          />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} pointerEvents="none" />

        {/* HUD */}
        <View style={[styles.hud, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Pressable onPress={onQuit} hitSlop={16} style={styles.quit}>
            <Text style={styles.quitText}>ESC</Text>
          </Pressable>

          <View style={styles.hudRight} pointerEvents="none">
            <Text style={styles.hudBig}>{Math.round(hud.dist / PX_PER_M)}m</Text>
            <Text style={styles.hudSmall}>
              {Math.round(hud.cleared)} cleared
              {showRt && hud.rt > 0 ? `  -  ${Math.round(hud.rt)}ms` : ''}
            </Text>
          </View>
        </View>

        {count > 0 ? (
          <View style={styles.countWrap} pointerEvents="none">
            <Text style={styles.countNum}>{count}</Text>
            <Text style={styles.countMode}>{cfg.name}</Text>
            <Text style={styles.countHint}>
              {mode === 'gate' ? 'red = jump   /   blue = hold' : 'tap anywhere to jump'}
            </Text>
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flash: { backgroundColor: C.go },

  hud: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 18 },
  quit: { paddingVertical: 4, paddingHorizontal: 6 },
  quitText: { color: C.dim, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  hudRight: { flex: 1, alignItems: 'flex-end' },
  hudBig: { color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  hudSmall: { color: C.dim, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginTop: 2 },

  countWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNum: { color: C.text, fontSize: 92, fontWeight: '200', letterSpacing: -4 },
  countMode: { color: C.go, fontSize: 13, fontWeight: '800', letterSpacing: 4, marginTop: 4 },
  countHint: { color: C.dim, fontSize: 12, marginTop: 14, letterSpacing: 0.6 },
});
