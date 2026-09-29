import { MODES } from '@/src/constants/modes';
import type { ModeId, RoundResult } from '@/src/types';
import { colorDeltaE } from '@/src/utils/color';

/**
 * Perceptual distance (CIEDE2000) at/above which a guess is "a different
 * color entirely" and scores 0. For reference: ΔE ≈ 1 is barely visible,
 * ≈ 10 is clearly a different shade, ≈ 30 is a different hue family.
 */
export const MAX_DELTA_E = 45;

/**
 * Accuracy curve: score = 100 · exp(-(ΔE / SCALE)^SHAPE).
 * Flat near 0 (tiny slips are forgiven), steep in the middle, and near zero
 * for clearly wrong colors. Reference points:
 *   ΔE 2 → 97 · ΔE 5 → 88 · ΔE 10 → 65 · ΔE 15 → 42 · ΔE 20 → 25 · ΔE 30 → 6 · ΔE 40 → 1
 */
const SCORE_SCALE = 16.5;
const SCORE_SHAPE = 1.7;

export interface ScoreParts {
  /** Accuracy 0-100 — 100 means a pixel-perfect match. */
  score: number;
  /** Human-facing deviation in percent — 0 means perfect. */
  deviationPct: number;
}

/** Map a CIEDE2000 distance to accuracy + deviation. */
export function scoreFromDelta(deltaE: number): ScoreParts {
  const d = Math.max(0, deltaE);
  const score = d >= MAX_DELTA_E
    ? 0
    : Math.round(100 * Math.exp(-Math.pow(d / SCORE_SCALE, SCORE_SHAPE)));
  return { score, deviationPct: 100 - score };
}

export type FeedbackTier = 'perfect' | 'almost' | 'close' | 'good' | 'off';

/**
 * Feedback tier for a given accuracy, tuned to the exp curve above:
 * perfect ≥97 (ΔE ≲ 2) · almost ≥88 (ΔE ≲ 5) · close ≥70 · good ≥45 · else off.
 */
export function feedbackKey(score: number): FeedbackTier {
  if (score >= 97) return 'perfect';
  if (score >= 88) return 'almost';
  if (score >= 70) return 'close';
  if (score >= 45) return 'good';
  return 'off';
}

/** Cumulative points a round contributes (accuracy + difficulty bonus). */
export function roundPoints(r: Pick<RoundResult, 'score' | 'modeBonus'>): number {
  return r.score + r.modeBonus;
}

function makeId(timestamp: number): string {
  return `${timestamp}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Build a full RoundResult from a target/guess pair. */
export function computeRound(args: {
  mode: ModeId;
  target: string;
  guess: string;
  reactionMs: number;
  timestamp: number;
}): RoundResult {
  const { mode, target, guess, reactionMs, timestamp } = args;
  const deltaE = colorDeltaE(target, guess);
  const { score, deviationPct } = scoreFromDelta(deltaE);
  return {
    id: makeId(timestamp),
    mode,
    target,
    guess,
    score,
    deltaE: Math.round(deltaE * 10) / 10,
    deviationPct,
    reactionMs: Math.max(0, Math.round(reactionMs)),
    modeBonus: MODES[mode].bonus,
    timestamp,
  };
}
