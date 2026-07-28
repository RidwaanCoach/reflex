import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Signature from '../components/Signature';
import { MODE_ORDER, MODES, PX_PER_M } from '../game/config';
import { bestFor } from '../storage';
import { C, S } from '../theme';
import type { ModeId, RunRecord } from '../types';

export default function MenuScreen({
  runs,
  haptics,
  onToggleHaptics,
  onPlay,
  onStats,
}: {
  runs: RunRecord[];
  haptics: boolean;
  onToggleHaptics: (v: boolean) => void;
  onPlay: (m: ModeId) => void;
  onStats: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[C.bgUp, C.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 0.7 }}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: S.pad, paddingTop: insets.top + 34, paddingBottom: 24 }}
      >
        <Text style={styles.title}>REFLEX</Text>
        <Text style={styles.sub}>procedural runner - reaction trainer</Text>

        <View style={{ height: 30 }} />

        {MODE_ORDER.map((id) => {
          const m = MODES[id];
          const b = bestFor(runs, id);
          return (
            <Pressable
              key={id}
              onPress={() => onPlay(id)}
              style={({ pressed }) => [styles.card, pressed && { borderColor: C.go, opacity: 0.9 }]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardName}>{m.name}</Text>
                <Text style={styles.cardBest}>
                  {b == null
                    ? 'no runs'
                    : m.metric === 'distance'
                      ? `${Math.round(b.bestDistance / PX_PER_M)}m best`
                      : b.bestMedianRt != null
                        ? `${b.bestMedianRt}ms best`
                        : `${b.bestCleared} cleared`}
                </Text>
              </View>
              <Text style={styles.cardTag}>{m.tagline}</Text>
              <Text style={styles.cardBlurb}>{m.blurb}</Text>
            </Pressable>
          );
        })}

        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>HAPTICS</Text>
          <Switch
            value={haptics}
            onValueChange={onToggleHaptics}
            trackColor={{ false: C.line, true: C.go }}
            thumbColor={C.text}
          />
        </View>

        <Pressable onPress={onStats} style={styles.statsLink}>
          <Text style={styles.statsText}>PROGRESS -&gt;</Text>
        </Pressable>
      </ScrollView>
      <Signature />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  title: { color: C.text, fontSize: 46, fontWeight: '800', letterSpacing: 6 },
  sub: { color: C.dim, fontSize: 12, letterSpacing: 1.2, marginTop: 6 },

  card: {
    backgroundColor: C.surface,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: S.radius,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cardName: { color: C.text, fontSize: 20, fontWeight: '800', letterSpacing: 3 },
  cardBest: { color: C.muted, fontSize: 12, fontWeight: '700' },
  cardTag: { color: C.go, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 3 },
  cardBlurb: { color: C.dim, fontSize: 12.5, lineHeight: 18, marginTop: 10 },

  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  prefLabel: { color: C.dim, fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },

  statsLink: { marginTop: 22, alignItems: 'center', paddingVertical: 10 },
  statsText: { color: C.muted, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
});
