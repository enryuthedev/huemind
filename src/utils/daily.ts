// Daily Challenge helpers — pure functions, no store / i18n access.
//
// Everyone gets the same 5 colors per local calendar day: the day key
// ('YYYY-MM-DD') is hashed into a seed for a mulberry32 PRNG, which then feeds
// `randomTargetHex`.

import type { ModeId } from '@/src/types';
import { randomTargetHex } from '@/src/utils/color';

/** Colors per daily challenge. */
export const DAILY_ROUNDS = 5;
/** Max achievable daily total. */
export const DAILY_MAX = DAILY_ROUNDS * 100;
/** Daily rounds always use Normal timing. */
export const DAILY_MODE: ModeId = 'normal';
/** Launch day → "HueMind #1". */
export const DAILY_EPOCH = '2026-10-01';

/** Small, fast, seedable PRNG. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit string hash. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The 5 target colors (#RRGGBB) for a given day key. */
export function dailyTargets(date: string): string[] {
  const rand = mulberry32(hashString(`huemind-daily-${date}`));
  return Array.from({ length: DAILY_ROUNDS }, () => randomTargetHex(rand));
}

/** Local 'YYYY-MM-DD' key for now (or `ts`). */
export function todayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function keyToUtcDays(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/** Running challenge number: days since launch + 1 (never below 1). */
export function dailyNumber(date: string): number {
  return Math.max(1, keyToUtcDays(date) - keyToUtcDays(DAILY_EPOCH) + 1);
}

/** Milliseconds until the next local midnight. */
export function msUntilMidnight(now: number = Date.now()): number {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return Math.max(0, next.getTime() - now);
}

/** `ms` as "HH:MM:SS". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => `${n}`.padStart(2, '0')).join(':');
}

/** Wordle-style square for a round score. */
export function scoreEmoji(score: number): string {
  if (score >= 88) return '🟩';
  if (score >= 70) return '🟨';
  if (score >= 45) return '🟧';
  return '🟥';
}

export function sumScores(scores: readonly number[]): number {
  return scores.reduce((a, b) => a + b, 0);
}
