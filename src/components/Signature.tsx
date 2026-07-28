import { StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';

/** Maker's mark. Shows up bottom-right on the shell screens, never in-game. */
export default function Signature() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.mark}>R.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-end', paddingRight: 22, paddingBottom: 10 },
  mark: {
    color: C.go,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    opacity: 0.55,
  },
});
