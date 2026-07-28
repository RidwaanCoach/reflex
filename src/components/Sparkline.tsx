import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { C } from '../theme';

/**
 * Median reaction time per run, oldest to newest. Down is better, so the
 * baseline is drawn at the best value rather than at zero.
 */
export default function Sparkline({
  data,
  width,
  height = 74,
}: {
  data: number[];
  width: number;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>
          {data.length ? 'one run logged - need two to trend' : 'no runs logged yet'}
        </Text>
      </View>
    );
  }

  const pad = 8;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const span = Math.max(hi - lo, 20); // never let a flat run look dramatic
  const x = (i: number) => pad + (i / (data.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + ((v - lo) / span) * (height - pad * 2);

  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const improving = data[data.length - 1] <= data[0];
  const stroke = improving ? C.good : C.warn;

  return (
    <Svg width={width} height={height}>
      <Line x1={pad} y1={y(lo)} x2={width - pad} y2={y(lo)} stroke={C.line} strokeWidth={1} strokeDasharray="3 5" />
      <Polyline points={pts} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={3.5} fill={stroke} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.dim, fontSize: 12 },
});
