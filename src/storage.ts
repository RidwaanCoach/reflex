import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ModeId, RunRecord } from './types';

const RUNS_KEY = 'reflex.runs.v1';
const PREFS_KEY = 'reflex.prefs.v1';
const MAX_RUNS = 400;

export type Prefs = { haptics: boolean };
export const DEFAULT_PREFS: Prefs = { haptics: true };

export async function loadRuns(): Promise<RunRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(RUNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveRun(run: RunRecord): Promise<RunRecord[]> {
  const runs = await loadRuns();
  const next = [run, ...runs].slice(0, MAX_RUNS);
  try {
    await AsyncStorage.setItem(RUNS_KEY, JSON.stringify(next));
  } catch {
    // a lost run is not worth interrupting the session over
  }
  return next;
}

export async function clearRuns(): Promise<void> {
  await AsyncStorage.removeItem(RUNS_KEY);
}

export async function loadPrefs(): Promise<Prefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function savePrefs(p: Prefs): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

// --- derived stats ---------------------------------------------------------

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function bestFor(runs: RunRecord[], mode: ModeId) {
  const mine = runs.filter((r) => r.mode === mode);
  if (!mine.length) return null;
  const rts = mine.map((r) => r.medianRt).filter((v): v is number => v != null);
  return {
    runs: mine.length,
    bestDistance: Math.max(...mine.map((r) => r.distance)),
    bestCleared: Math.max(...mine.map((r) => r.cleared)),
    bestMedianRt: rts.length ? Math.min(...rts) : null,
    bestRt: Math.min(...mine.map((r) => r.bestRt ?? Infinity).filter((v) => Number.isFinite(v)), Infinity),
  };
}

/** median RT of the most recent N runs for a mode, oldest first, for trending */
export function rtTrend(runs: RunRecord[], mode: ModeId, n = 20): number[] {
  return runs
    .filter((r) => r.mode === mode && r.medianRt != null)
    .slice(0, n)
    .map((r) => r.medianRt as number)
    .reverse();
}
