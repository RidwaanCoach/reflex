import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { C, S } from '../theme';

export function Btn({
  label,
  sub,
  onPress,
  tone = 'default',
  style,
}: {
  label: string;
  sub?: string;
  onPress: () => void;
  tone?: 'default' | 'primary' | 'ghost';
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        tone === 'primary' && styles.btnPrimary,
        tone === 'ghost' && styles.btnGhost,
        pressed && { opacity: 0.72, transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      <Text style={[styles.btnLabel, tone === 'ghost' && { color: C.muted }]}>{label}</Text>
      {sub ? <Text style={styles.btnSub}>{sub}</Text> : null}
    </Pressable>
  );
}

export function Tile({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <View style={styles.tileRow}>
        <Text style={[styles.tileValue, tone ? { color: tone } : null]}>{value}</Text>
        {unit ? <Text style={styles.tileUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 26 }}>
      <Text style={styles.section}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: C.surface,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: S.radius,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  btnPrimary: { backgroundColor: C.go, borderColor: C.go },
  btnGhost: { backgroundColor: 'transparent', borderColor: 'transparent', paddingVertical: 12 },
  btnLabel: { color: C.text, fontSize: 15, fontWeight: '700', letterSpacing: 1.4 },
  btnSub: { color: 'rgba(255,255,255,0.62)', fontSize: 12, marginTop: 4, letterSpacing: 0.3 },

  tile: {
    flex: 1,
    backgroundColor: C.surface,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: S.radius,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  tileLabel: { color: C.dim, fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  tileRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  tileValue: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  tileUnit: { color: C.dim, fontSize: 12, marginLeft: 4, fontWeight: '600' },

  section: { color: C.dim, fontSize: 10, fontWeight: '800', letterSpacing: 1.6, marginBottom: 10 },
});
