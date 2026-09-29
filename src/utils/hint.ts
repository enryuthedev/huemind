// Coaching hint for the result screen: what was the *dominant* mistake?
//
// The player picks in HSV, so the hint is phrased in HSV terms (hue /
// saturation / brightness) — but which one "dominates" is decided
// perceptually: we change one HSV component of the target at a time to the
// guess's value and measure the CIEDE2000 distance each change alone causes.
// The component with the largest perceptual impact wins.

import type { HSV } from '@/src/types';
import { colorDeltaE, hexToHsv, hsvToHex } from '@/src/utils/color';
import { scoreFromDelta } from '@/src/utils/scoring';

export type HueDirection =
  | 'towardRed'
  | 'towardYellow'
  | 'towardGreen'
  | 'towardBlue'
  | 'towardViolet'
  | 'towardPink';

export type HintKind = 'tooLight' | 'tooDark' | 'tooSaturated' | 'tooMuted' | 'hueShift';

export interface ColorHint {
  kind: HintKind;
  /** Only set when `kind === 'hueShift'`: the hue the guess drifted toward. */
  direction: HueDirection | null;
  /** Full i18n key, e.g. `result.hint.tooLight` or `result.hint.towardYellow`. */
  i18nKey: string;
}

/** At or above this accuracy there is nothing worth coaching. */
export const HINT_NONE_MIN_SCORE = 97;

/** Signed shortest angular difference `to - from` in degrees, in (-180, 180]. */
function hueDiff(from: number, to: number): number {
  let d = (((to - from) % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

/** Named anchors on the HSV wheel (degrees). */
const HUE_ANCHORS: ReadonlyArray<{ hue: number; dir: HueDirection }> = [
  { hue: 0, dir: 'towardRed' },
  { hue: 55, dir: 'towardYellow' },
  { hue: 120, dir: 'towardGreen' },
  { hue: 235, dir: 'towardBlue' },
  { hue: 275, dir: 'towardViolet' },
  { hue: 320, dir: 'towardPink' },
];

/** Anchors closer than this to the target hue are skipped (it *is* that hue). */
const ANCHOR_MARGIN = 15;

/**
 * Walking from `targetHue` in the direction of the shift, the first named hue
 * we meet is what the guess drifted toward (orange + → yellow, orange − → red,
 * blue − → green, blue + → violet).
 */
function hueDirection(targetHue: number, shift: number): HueDirection {
  const sign = shift >= 0 ? 1 : -1;
  let best: HueDirection = HUE_ANCHORS[0].dir;
  let bestDist = Infinity;
  for (const anchor of HUE_ANCHORS) {
    // Distance travelled from target to anchor in the shift direction, [0,360).
    const dist = ((((anchor.hue - targetHue) * sign) % 360) + 360) % 360;
    if (dist < ANCHOR_MARGIN) continue;
    if (dist < bestDist) {
      bestDist = dist;
      best = anchor.dir;
    }
  }
  return best;
}

/**
 * Dominant error between `target` and `guess` (#RRGGBB), or `null` when the
 * guess is essentially perfect (score ≥ 97). Pass `score` if already known.
 */
export function colorHint(target: string, guess: string, score?: number): ColorHint | null {
  const s = score ?? scoreFromDelta(colorDeltaE(target, guess)).score;
  if (s >= HINT_NONE_MIN_SCORE) return null;

  const t = hexToHsv(target);
  const g = hexToHsv(guess);
  const impact = (hsv: HSV) => colorDeltaE(target, hsvToHex(hsv));

  const dHue = hueDiff(t.h, g.h);
  const eHue = impact({ ...t, h: g.h });
  const eSat = impact({ ...t, s: g.s });
  const eVal = impact({ ...t, v: g.v });

  if (eHue >= eSat && eHue >= eVal) {
    const direction = hueDirection(t.h, dHue);
    return { kind: 'hueShift', direction, i18nKey: `result.hint.${direction}` };
  }
  if (eVal >= eSat) {
    const kind: HintKind = g.v > t.v ? 'tooLight' : 'tooDark';
    return { kind, direction: null, i18nKey: `result.hint.${kind}` };
  }
  const kind: HintKind = g.s > t.s ? 'tooSaturated' : 'tooMuted';
  return { kind, direction: null, i18nKey: `result.hint.${kind}` };
}
