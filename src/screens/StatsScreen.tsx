import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Signature from '../components/Signature';
import Sparkline from '../components/Sparkline';
import { Btn, Section, Tile } from '../components/ui';
import { MODE_ORDER, MODES, PX_PER_M } from '../game/config';
import { bestFor, rtTrend } from '../storage';
import { C, S } from '../theme';
import type { RunRecord } from '../types';

export default function StatsScreen({
  runs,
  onBack,
  onClear,
}: {
  runs: RunRecord[];
  onBack: () => void;
  onClear: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const [confirming, setConfirming] = useState(false);
  const cardW = W - S.pad * 2 - 32;

  const confirmClear = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    Alert.alert('Wipe all runs?', 'Every logged run and personal best is deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel', onPress: () => setConfirming(false) },
      {
        text: 'Wipe',
        style: 'destructive',
        onPress: () => {
          setConfirming(false);
          onClear();
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: S.pad, paddingTop: insets.top + 18, paddingBottom: 24 }}
      >
        <Text style={styles.title}>PROGRESS</Text>
        <Text style={styles.sub}>{runs.length} runs logged</Text>

        {MODE_ORDER.map((id) => {
          const m = MODES[id];
          const b = bestFor(runs, id);
          const trend = rtTrend(runs, id);

          return (
            <Section key={id} title={m.name}>
              {b == null ? (
                <View style={styles.card}>
                  <Text style={styles.empty}>Nothing logged yet.</Text>
                </View>
              ) : (
                <View style={styles.card}>
                  <View style={styles.row}>
                    <Tile label="RUNS" value={`${b.runs}`} />
                    <View style={{ width: 10 }} />
                    {m.metric === 'distance' ? (
                      <Tile label="FURTHEST" value={`${Math.round(b.bestDistance / PX_PER_M)}`} unit="m" />
                    ) : (
                      <Tile
                        label="BEST MEDIAN"
                        value={b.bestMedianRt != null ? `${b.bestMedianRt}` : '--'}
                        unit="ms"
                        tone={C.good}
                      />
                    )}
                    <View style={{ width: 10 }} />
                    <Tile
                      label={m.metric === 'distance' ? 'MOST CLEARED' : 'FASTEST'}
                      value={
                        m.metric === 'distance'
                          ? `${b.bestCleared}`
                          : Number.isFinite(b.bestRt)
                            ? `${Math.round(b.bestRt)}`
                            : '--'
                      }
                      unit={m.metric === 'distance' ? undefined : 'ms'}
                    />
                  </View>

                  {m.metric !== 'distance' ? (
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.chartLabel}>MEDIAN REACTION PER RUN - LOWER IS BETTER</Text>
                      <Sparkline data={trend} width={cardW} />
                    </View>
                  ) : null}
                </View>
              )}
            </Section>
          );
        })}

        <Text style={styles.footnote}>
          Reaction is measured from the frame an obstacle becomes visible to the frame your tap lands, so
          readings are quantised to about 8ms. Absolute numbers will run a touch optimistic against a lab
          test - the trend line is the part that matters.
        </Text>

        <View style={{ height: 24 }} />
        <Btn label="BACK" onPress={onBack} />
        <View style={{ height: 10 }} />
        <Btn
          label={confirming ? 'TAP AGAIN TO WIPE' : 'RESET ALL DATA'}
          tone="ghost"
          onPress={confirmClear}
        />
      </ScrollView>
      <Signature />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  title: { color: C.text, fontSize: 34, fontWeight: '800', letterSpacing: 3 },
  sub: { color: C.dim, fontSize: 12, marginTop: 4, letterSpacing: 0.8 },
  card: { backgroundColor: C.surfaceUp, borderColor: C.line, borderWidth: 1, borderRadius: S.radius, padding: 15 },
  row: { flexDirection: 'row' },
  empty: { color: C.dim, fontSize: 13 },
  chartLabel: { color: C.dim, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  footnote: { color: C.dim, fontSize: 11.5, lineHeight: 17, marginTop: 30 },
});
