import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import GameScreen from './src/screens/GameScreen';
import MenuScreen from './src/screens/MenuScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import StatsScreen from './src/screens/StatsScreen';
import { clearRuns, DEFAULT_PREFS, loadPrefs, loadRuns, savePrefs, saveRun, type Prefs } from './src/storage';
import { C } from './src/theme';
import type { ModeId, RunRecord } from './src/types';

type Screen = 'menu' | 'game' | 'results' | 'stats';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [mode, setMode] = useState<ModeId>('blind');
  const [lastRun, setLastRun] = useState<RunRecord | null>(null);
  // bumping this forces a clean engine on every attempt
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    loadRuns().then(setRuns);
    loadPrefs().then(setPrefs);
  }, []);

  const play = useCallback((m: ModeId) => {
    setMode(m);
    setAttempt((a) => a + 1);
    setScreen('game');
  }, []);

  const handleEnd = useCallback(async (run: RunRecord) => {
    setLastRun(run);
    setScreen('results');
    setRuns(await saveRun(run));
  }, []);

  const toggleHaptics = useCallback((v: boolean) => {
    const next = { haptics: v };
    setPrefs(next);
    savePrefs(next);
  }, []);

  const wipe = useCallback(async () => {
    await clearRuns();
    setRuns([]);
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.root}>
          <StatusBar style="light" />

          {screen === 'menu' ? (
            <MenuScreen
              runs={runs}
              haptics={prefs.haptics}
              onToggleHaptics={toggleHaptics}
              onPlay={play}
              onStats={() => setScreen('stats')}
            />
          ) : null}

          {screen === 'game' ? (
            <GameScreen
              key={attempt}
              mode={mode}
              haptics={prefs.haptics}
              onEnd={handleEnd}
              onQuit={() => setScreen('menu')}
            />
          ) : null}

          {screen === 'results' && lastRun ? (
            <ResultsScreen
              run={lastRun}
              runs={runs}
              onRetry={() => play(lastRun.mode)}
              onMenu={() => setScreen('menu')}
              onStats={() => setScreen('stats')}
            />
          ) : null}

          {screen === 'stats' ? (
            <StatsScreen runs={runs} onBack={() => setScreen('menu')} onClear={wipe} />
          ) : null}
        </View>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
});
