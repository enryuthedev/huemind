// Pure "Farb-Analyse" (HueMind Pro) computations over `Stats`.
//
// No hooks, no i18n, no store access — label keys are translated at the call
// site (`colors.<key>`, `modes.<id>.short`).

import type { ModeId, RoundResult, Stats } from '@/src/types';
import { MODE_ORDER } from '@/src/constants/modes';
import { colorNameKey, type ColorNameKey } from '@/src/utils/colorName';

/** Minimum rounds before the analysis is meaningful. */
export const MIN_ANALYSIS_ROUNDS = 5;

/** Number of recent rounds listed in the analysis. */
export const RECENT_ROUNDS = 10;

export interface ColorFamilyStat {
  key: ColorNameKey;
  /** Mean accuracy (0-100), rounded. */
  avg: number;
  /** Number of rounds whose target fell into this family. */
  count: number;
}

export interface ColorAnalysis {
  /** Families sorted weakest first (lowest average score). */
  families: ColorFamilyStat[];
  /** Best accuracy per mode; null when the mode was never played. */
  bestPerMode: Record<ModeId, number | null>;
  /** Most recent rounds, newest first. */
  recent: RoundResult[];
}

/** True once enough rounds exist for the analysis. */
export function hasEnoughForAnalysis(stats: Stats): boolean {
  return stats.history.length >= MIN_ANALYSIS_ROUNDS;
}

/** Average score per color family (by target color), weakest first. */
export function colorFamilyStats(history: RoundResult[]): ColorFamilyStat[] {
  const sums = new Map<ColorNameKey, number>();
  const counts = new Map<ColorNameKey, number>();
  for (const r of history) {
    const key = colorNameKey(r.target);
    sums.set(key, (sums.get(key) ?? 0) + r.score);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: ColorFamilyStat[] = [];
  for (const [key, sum] of sums) {
    const count = counts.get(key) ?? 1;
    out.push({ key, avg: Math.round(sum / count), count });
  }
  // Weakest first; ties → more samples first (more reliable signal).
  out.sort((a, b) => a.avg - b.avg || b.count - a.count);
  return out;
}

/** Best accuracy per mode (null = never played). */
export function bestScorePerMode(history: RoundResult[]): Record<ModeId, number | null> {
  const best = Object.fromEntries(MODE_ORDER.map((id) => [id, null])) as Record<
    ModeId,
    number | null
  >;
  for (const r of history) {
    const current = best[r.mode];
    if (current === undefined) continue; // unknown mode id from old data
    if (current === null || r.score > current) best[r.mode] = r.score;
  }
  return best;
}

/** The last `n` rounds, newest first. */
export function recentRounds(history: RoundResult[], n: number = RECENT_ROUNDS): RoundResult[] {
  return history.slice(-n).reverse();
}

/**
 * The `n` weakest color families (by average score) — used for the
 * "Schwächen-Training" hint. Empty when there is not enough history.
 */
export function weakestFamilies(stats: Stats, n = 3): ColorNameKey[] {
  if (!hasEnoughForAnalysis(stats)) return [];
  return colorFamilyStats(stats.history)
    .slice(0, n)
    .map((f) => f.key);
}

/** Full analysis snapshot for the progress screen. */
export function computeAnalysis(stats: Stats): ColorAnalysis {
  const { history } = stats;
  return {
    families: colorFamilyStats(history),
    bestPerMode: bestScorePerMode(history),
    recent: recentRounds(history),
  };
}
