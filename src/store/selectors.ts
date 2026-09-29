// Pure, side-effect-free selectors over `Stats`.
//
// These are plain functions (no hooks, no i18n, no store access) so they can be
// reused from screens, tests, and memoized callbacks. User-facing translation of
// the returned label keys happens at the call site (e.g. `t('days.' + key)`).

import type { RoundResult, Stats } from '@/src/types';
import { colorNameKey } from '@/src/utils/colorName';
import { hsvToHex, randomTargetHex } from '@/src/utils/color';
import { roundPoints } from '@/src/utils/scoring';

/** i18n day-key suffixes for a Monday-first week (used under `days.*`). */
const WEEK_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Sum of every round's cumulative points (accuracy + difficulty bonus). */
export function totalPoints(stats: Stats): number {
  return stats.history.reduce((sum, r) => sum + roundPoints(r), 0);
}

/** Mean accuracy across all rounds, rounded; 0 when there is no history. */
export function averageScore(stats: Stats): number {
  const { history } = stats;
  if (history.length === 0) return 0;
  const sum = history.reduce((acc, r) => acc + r.score, 0);
  return Math.round(sum / history.length);
}

/** Total number of rounds played. */
export function roundsPlayed(stats: Stats): number {
  return stats.history.length;
}

/** Local midnight at the start of the day containing `ts`. */
function startOfDay(ts: number): Date {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Local midnight of the Monday that begins the week containing `ts`. */
function startOfWeekMonday(ts: number): Date {
  const d = startOfDay(ts);
  // getDay(): 0 = Sunday … 6 = Saturday → shift so Monday = 0.
  const mondayOffset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mondayOffset);
  return d;
}

/** Format a local Date as a 'YYYY-MM-DD' day key. */
function formatDayKey(d: Date): string {
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local 'YYYY-MM-DD' day key for an epoch-ms timestamp. */
export function dayKey(ts: number): string {
  return formatDayKey(new Date(ts));
}

/**
 * Local 'YYYY-MM-DD' key of the calendar day before the day containing `ts`.
 * Uses calendar arithmetic (not `ts - 24h`) so DST transitions are safe.
 */
export function previousDayKey(ts: number): string {
  const d = new Date(ts);
  return formatDayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
}

/**
 * The streak as it should be *displayed* right now: the stored streak while it
 * is still alive (last round played today or yesterday), otherwise 0.
 */
export function currentStreak(stats: Stats, now: number = Date.now()): number {
  const { lastPlayedDay, streak } = stats;
  if (!lastPlayedDay) return 0;
  if (lastPlayedDay === dayKey(now) || lastPlayedDay === previousDayKey(now)) {
    return streak;
  }
  return 0;
}

/**
 * Per-day average accuracy (Mon..Sun) for the week containing `now`
 * (`null` = no rounds that day), plus which days lie after today.
 */
function weeklyBuckets(
  stats: Stats,
  now: number,
): { avgs: (number | null)[]; isFuture: boolean[] } {
  const sums = new Array<number>(7).fill(0);
  const counts = new Array<number>(7).fill(0);
  const isFuture = new Array<boolean>(7).fill(false);
  const todayStart = startOfDay(now).getTime();

  const weekStart = startOfWeekMonday(now);
  const y = weekStart.getFullYear();
  const m = weekStart.getMonth();
  const d0 = weekStart.getDate();
  for (let i = 0; i < 7; i += 1) {
    const start = new Date(y, m, d0 + i).getTime();
    const end = new Date(y, m, d0 + i + 1).getTime();
    isFuture[i] = start > todayStart;

    for (const r of stats.history) {
      if (r.timestamp >= start && r.timestamp < end) {
        sums[i] += r.score;
        counts[i] += 1;
      }
    }
  }

  const avgs = sums.map((sum, i) => (counts[i] > 0 ? Math.round(sum / counts[i]) : null));
  return { avgs, isFuture };
}

/**
 * Seven entries (Mon..Sun) for the week containing `now`. `values[i]` is the
 * average accuracy of rounds played on that day (0 if none — kept numeric for
 * `WeeklyChart`). `isFuture[i]` flags days after today. `labels[i]` is the
 * matching i18n day-key suffix (`'mon'..'sun'`); translate at the call site.
 */
export function weeklyScores(
  stats: Stats,
  now: number,
): { values: number[]; labels: string[]; isFuture: boolean[] } {
  const { avgs, isFuture } = weeklyBuckets(stats, now);
  const values = avgs.map((v) => v ?? 0);
  const labels = WEEK_DAY_KEYS.map((key) => key);
  return { values, labels, isFuture };
}

/**
 * Null-safe variant of `weeklyScores`: days after today are `null` (not 0) so
 * a chart can end its line at today. Past days without rounds stay 0.
 */
export function weeklyScoresNullable(
  stats: Stats,
  now: number,
): { values: (number | null)[]; labels: string[] } {
  const { avgs, isFuture } = weeklyBuckets(stats, now);
  const values = avgs.map((v, i) => (isFuture[i] ? null : (v ?? null)));
  const labels = WEEK_DAY_KEYS.map((key) => key);
  return { values, labels };
}

/** Average accuracy per coarse color bucket, keyed by `colorNameKey`. */
function colorBucketAverages(history: RoundResult[]): Map<string, number> {
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const r of history) {
    const key = colorNameKey(r.target);
    sums.set(key, (sums.get(key) ?? 0) + r.score);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const averages = new Map<string, number>();
  for (const [key, sum] of sums) {
    averages.set(key, sum / (counts.get(key) as number));
  }
  return averages;
}

/** Color bucket with the highest average accuracy; null when no history. */
export function bestColorKey(stats: Stats): string | null {
  if (stats.history.length === 0) return null;
  const averages = colorBucketAverages(stats.history);
  let bestKey: string | null = null;
  let bestAvg = -Infinity;
  for (const [key, avg] of averages) {
    if (avg > bestAvg) {
      bestAvg = avg;
      bestKey = key;
    }
  }
  return bestKey;
}

/** Color bucket with the lowest average accuracy; null when no history. */
export function hardestColorKey(stats: Stats): string | null {
  if (stats.history.length === 0) return null;
  const averages = colorBucketAverages(stats.history);
  let hardestKey: string | null = null;
  let hardestAvg = Infinity;
  for (const [key, avg] of averages) {
    if (avg < hardestAvg) {
      hardestAvg = avg;
      hardestKey = key;
    }
  }
  return hardestKey;
}

/**
 * Momentum signal: mean accuracy of the last 5 rounds minus the 5 before them,
 * rounded to one decimal. Returns 0 until at least 10 rounds exist.
 */
export function trendDelta(stats: Stats): number {
  const { history } = stats;
  if (history.length < 10) return 0;
  const recent = history.slice(-5);
  const previous = history.slice(-10, -5);
  const mean = (rounds: RoundResult[]): number =>
    rounds.reduce((acc, r) => acc + r.score, 0) / rounds.length;
  const delta = mean(recent) - mean(previous);
  return Math.round(delta * 10) / 10;
}

// ---------------------------------------------------------------------------
// Schwächen-Training (Pro)
// ---------------------------------------------------------------------------

/** Minimum rounds of a color family before it counts as a measured weakness. */
const MIN_FAMILY_SAMPLES = 3;

/**
 * Up to two color families (`colorNameKey`s) with the lowest average accuracy,
 * considering only families with at least 3 rounds and that the target
 * generator can actually produce. Weakest first; [] when not enough data.
 */
export function weakestFamilies(stats: Stats, count = 2): string[] {
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const r of stats.history) {
    const key = colorNameKey(r.target);
    if (!(key in FAMILY_RANGES)) continue;
    sums.set(key, (sums.get(key) ?? 0) + r.score);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...sums.entries()]
    .filter(([key]) => (counts.get(key) ?? 0) >= MIN_FAMILY_SAMPLES)
    .map(([key, sum]) => ({ key, avg: sum / (counts.get(key) as number) }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, count)
    .map((e) => e.key);
}

interface FamilyRange {
  /** Hue range in degrees; `h0` may be negative to wrap around red. */
  h0: number;
  h1: number;
  /** Value range, kept inside the family's `colorNameKey` bucket. */
  v0: number;
  v1: number;
}

/** Hue/value windows mirroring `colorNameKey` (saturation always 0.45–1). */
const FAMILY_RANGES: Record<string, FamilyRange> = {
  red: { h0: -15, h1: 15, v0: 0.55, v1: 1 },
  orange: { h0: 15, h1: 40, v0: 0.55, v1: 1 },
  brown: { h0: 5, h1: 38, v0: 0.4, v1: 0.54 },
  yellow: { h0: 40, h1: 65, v0: 0.4, v1: 1 },
  lime: { h0: 65, h1: 90, v0: 0.4, v1: 1 },
  green: { h0: 90, h1: 150, v0: 0.4, v1: 1 },
  teal: { h0: 150, h1: 175, v0: 0.4, v1: 1 },
  cyan: { h0: 175, h1: 195, v0: 0.4, v1: 1 },
  blue: { h0: 195, h1: 240, v0: 0.4, v1: 1 },
  indigo: { h0: 240, h1: 265, v0: 0.4, v1: 1 },
  purple: { h0: 265, h1: 290, v0: 0.4, v1: 1 },
  magenta: { h0: 290, h1: 320, v0: 0.4, v1: 1 },
  pink: { h0: 320, h1: 345, v0: 0.4, v1: 1 },
};

/**
 * Target color for Schwächen-Training: drawn from one of the player's weakest
 * families (see `weakestFamilies`), with random saturation/value like
 * `randomTargetHex`. Falls back to a fully random target without enough data.
 */
export function trainingTargetHex(stats: Stats, rand: () => number = Math.random): string {
  return trainingTarget(stats, rand).hex;
}

/** Like `trainingTargetHex`, but also returns the chosen family (null = random). */
export function trainingTarget(
  stats: Stats,
  rand: () => number = Math.random,
): { hex: string; family: string | null } {
  const families = weakestFamilies(stats);
  if (families.length === 0) {
    return { hex: randomTargetHex(rand), family: null };
  }
  const family = families[Math.floor(rand() * families.length)] ?? families[0];
  const range = FAMILY_RANGES[family];
  // Nudge inside the edges so rounding never flips the bucket.
  for (let i = 0; i < 12; i += 1) {
    const h = (range.h0 + 1 + rand() * (range.h1 - range.h0 - 2) + 360) % 360;
    const s = 0.45 + rand() * 0.55;
    const v = range.v0 + rand() * (range.v1 - range.v0);
    const hex = hsvToHex({ h, s, v });
    if (colorNameKey(hex) === family) return { hex, family };
  }
  return { hex: randomTargetHex(rand), family: null };
}
