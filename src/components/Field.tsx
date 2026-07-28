import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { BAR_H, BAR_W, BAR_Y, PLAYER_SIZE, SPIKE_H, SPIKE_W } from '../game/config';
import type { Slot } from '../game/engine';
import { C } from '../theme';

const TICK_GAP = 64;

/**
 * One obstacle slot. Both shapes are mounted permanently and toggled by
 * opacity, so a spawn never changes layout - the only thing that animates per
 * frame is a transform.
 */
const Obstacle = memo(function Obstacle({ slot }: { slot: Slot }) {
  const spike = useAnimatedStyle(() => ({
    opacity: slot.kind.value === 1 ? slot.vis.value : 0,
    transform: [{ translateX: slot.x.value }],
  }));
  const bar = useAnimatedStyle(() => ({
    opacity: slot.kind.value === 2 ? slot.vis.value : 0,
    transform: [{ translateX: slot.x.value }],
  }));

  return (
    <>
      <Animated.View style={[styles.spike, spike]} />
      <Animated.View style={[styles.bar, bar]} />
    </>
  );
});

function Player({ playerY, rot, x }: { playerY: SharedValue<number>; rot: SharedValue<number>; x: number }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -playerY.value }, { rotate: `${rot.value}deg` }],
  }));

  return (
    <>
      {[42, 28, 14].map((off, i) => (
        <Animated.View
          key={off}
          style={[styles.cube, { left: x - off, opacity: [0.07, 0.14, 0.26][i] }, style]}
        />
      ))}
      <Animated.View style={[styles.cube, styles.cubeLead, { left: x }, style]} />
    </>
  );
}

export default function Field({
  slots,
  playerY,
  rot,
  dist,
  reveal,
  playerX,
  groundY,
  showReveal,
}: {
  slots: Slot[];
  playerY: SharedValue<number>;
  rot: SharedValue<number>;
  dist: SharedValue<number>;
  reveal: SharedValue<number>;
  playerX: number;
  groundY: number;
  showReveal: boolean;
}) {
  const ticks = useAnimatedStyle(() => ({ transform: [{ translateX: -(dist.value % TICK_GAP) }] }));
  const revealLine = useAnimatedStyle(() => ({ transform: [{ translateX: playerX + reveal.value }] }));

  return (
    <>
      {/* everything above the ground line */}
      <View style={[styles.air, { height: groundY }]} pointerEvents="none">
        {showReveal ? <Animated.View style={[styles.revealLine, revealLine]} /> : null}
        {slots.map((s, i) => (
          <Obstacle key={i} slot={s} />
        ))}
        <Player playerY={playerY} rot={rot} x={playerX} />
      </View>

      {/* ground */}
      <View style={[styles.ground, { top: groundY }]} pointerEvents="none">
        <View style={styles.groundLine} />
        <Animated.View style={[styles.tickRow, ticks]}>
          {Array.from({ length: 24 }, (_, i) => (
            <View key={i} style={[styles.tick, { left: i * TICK_GAP }]} />
          ))}
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // visible, not hidden: the player's glow spills past the ground line and
  // obstacles are parked off-screen right anyway
  air: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'visible' },

  spike: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: SPIKE_W / 2,
    borderRightWidth: SPIKE_W / 2,
    borderBottomWidth: SPIKE_H,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: C.go,
  },
  bar: {
    position: 'absolute',
    bottom: BAR_Y,
    left: 0,
    width: BAR_W,
    height: BAR_H,
    borderRadius: 5,
    backgroundColor: C.nogo,
  },

  cube: {
    position: 'absolute',
    bottom: 0,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: 7,
    backgroundColor: C.player,
  },
  cubeLead: {
    shadowColor: C.go,
    shadowOpacity: 0.85,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },

  revealLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 1,
    backgroundColor: 'rgba(242,244,247,0.10)',
  },

  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  groundLine: { height: 2, backgroundColor: C.line },
  tickRow: { position: 'absolute', top: 2, left: 0, height: 22, width: 24 * TICK_GAP },
  tick: { position: 'absolute', top: 0, width: 2, height: 10, backgroundColor: 'rgba(242,244,247,0.07)' },
});
