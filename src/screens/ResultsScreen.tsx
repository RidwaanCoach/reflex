import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Signature from '../components/Signature';
import { Btn, Tile } from '../components/ui';
import { MODES, PX_PER_M } from '../game/config';
import { C, S } from '../theme';
import type { RunRecord } from '../types';

function prevBest(runs: RunRecord[], run: RunRecord) {
  const prior = runs.filter((r) => r.mode === run.mode && r.id !== run.id);
  if (!prior.length) return null;
  return {
    distance: Math.max(...prior.map((r) => r.distance)),
    cleared: Math.max(...prior.map((r) => r.cleared)),
    medianRt: prior.reduce<number | null>(
      (acc, r) => (r.medianRt == null ? acc : acc == null ? r.medianRt : Math.min(acc, r.medianRt)),
      null
    ),
  };
}

export default function ResultsScreen({
  run,
  runs,
  onRetry,
  onMenu,
  onStats,
}: {
  run: RunRecord;
  runs: RunRecord[];
  onRetry: () => void;
  onMenu: () => void;
  onStats: () => void;
}) {
  const insets = useSafeAreaInsets();
  const cfg = MODES[run.mode];
  const pb = prevBest(runs, run);

  const metres = Math.round(run.distance / PX_PER_M);
  const attempts = run.rtCount + run.falseAlarms;
  const accuracy = attempts > 0 ? Math.round((run.rtCount / attempts) * 100) : null;

  let headValue = `${metres}`;
  let headUnit = 'm';
  let headLabel = 'DISTANCE';
  let beat = false;
  let delta: string | null = null;

  if (cfg.metric === 'distance') {
    beat = pb != null && run.distance > pb.distance;
    if (pb) delta = `best ${Math.round(pb.distance / PX_PER_M)}m`;
  } else {
    headLabel = 'MEDIAN REACTION';
    headUnit = 'ms';
    headValue = run.medianRt != null ? `${run.medianRt}` : '--';
    if (run.medianRt != null && pb?.medianRt != null) {
      beat = run.medianRt < pb.medianRt;
      const d = run.medianRt - pb.medianRt;
      delta = `${d <= 0 ? '' : '+'}${d}ms vs best ${pb.medianRt}ms`;
    } else if (run.medianRt != null) {
      beat = true;
      delta = 'first logged run for this mode';
    } else {
      delta = 'no clean responses to measure';
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 18 }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.pad, paddingBottom: 20 }}>
        <Text style={styles.kicker}>{cfg.name} RUN</Text>

        <View style={styles.head}>
          <Text style={styles.headValue}>{headValue}</Text>
          <Text style={styles.headUnit}>{headUnit}</Text>
        </View>
        <Text style={styles.headLabel}>{headLabel}</Text>

        {delta ? (
          <Text style={[styles.delta, beat && { color: C.good }]}>
            {beat ? 'NEW BEST  -  ' : ''}
            {delta}
          </Text>
        ) : null}

        <View style={styles.row}>
          <Tile label="CLEARED" value={`${run.cleared}`} />
          <View style={{ width: 10 }} />
          {cfg.metric === 'distance' ? (
            <Tile label="TOP SPEED" value={`${Math.round(run.topSpeed / 10)}`} unit="u/s" />
          ) : (
            <Tile label="FASTEST" value={run.bestRt != null ? `${run.bestRt}` : '--'} unit="ms" />
          )}
        </View>

        {cfg.metric === 'distance' ? null : (
          <View style={[styles.row, { marginTop: 10 }]}>
            <Tile
              label="ACCURACY"
              value={accuracy != null ? `${accuracy}` : '--'}
              unit="%"
              tone={accuracy != null && accuracy < 80 ? C.warn : undefined}
            />
            <View style={{ width: 10 }} />
            <Tile
              label={run.mode === 'gate' ? 'HELD CORRECTLY' : 'EARLY TAPS'}
              value={`${run.mode === 'gate' ? run.correctRejects : run.falseAlarms}`}
            />
          </View>
        )}

        <Text style={styles.note}>
          {run.endedBy === 'bar'
            ? 'Killed by a blue bar. That is an impulse error - you moved before you identified.'
            : 'Killed by a spike. You saw it late or not at all.'}
        </Text>

        <View style={{ height: 22 }} />
        <Btn label="RUN IT AGAIN" tone="primary" onPress={onRetry} />
        <View style={{ height: 10 }} />
        <Btn label="STATS" onPress={onStats} />
        <View style={{ height: 10 }} />
        <Btn label="MENU" tone="ghost" onPress={onMenu} />
      </ScrollView>
      <Signature />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  kicker: { color: C.go, fontSize: 11, fontWeight: '800', letterSpacing: 3 },
  head: { flexDirection: 'row', alignItems: 'baseline', marginTop: 14 },
  headValue: { color: C.text, fontSize: 76, fontWeight: '800', letterSpacing: -3 },
  headUnit: { color: C.muted, fontSize: 20, fontWeight: '700', marginLeft: 6 },
  headLabel: { color: C.dim, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  delta: { color: C.muted, fontSize: 13, marginTop: 8, marginBottom: 22, fontWeight: '600' },
  row: { flexDirection: 'row' },
  note: { color: C.dim, fontSize: 12, lineHeight: 18, marginTop: 18 },
});
