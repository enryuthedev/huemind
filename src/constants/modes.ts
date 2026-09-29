import type { ModeConfig, ModeId } from '@/src/types';

/** Mode config plus monetization flag (`pro` = requires HueMind Pro). */
export type AppModeConfig = ModeConfig & { pro: boolean };

/**
 * Difficulty modes. Names / descriptions are resolved from i18n at
 * `modes.<id>.name`, `modes.<id>.tagline`, `modes.<id>.short`.
 * Accents are intentionally muted; they only tint borders and glows so the
 * round's game color stays the visual focus.
 *
 * Monetization: Leicht + Normal are free; Schwer + Hardcore need HueMind Pro.
 */
export const MODES: Record<ModeId, AppModeConfig> = {
  easy: {
    id: 'easy',
    pro: false,
    memorizeSeconds: 10,
    difficulty: 1,
    accent: '#4ECDC4',
    icon: 'spa',
    bonus: 0,
    hardcore: false,
  },
  normal: {
    id: 'normal',
    pro: false,
    memorizeSeconds: 5,
    difficulty: 2,
    accent: '#5B8DEF',
    icon: 'grid-view',
    bonus: 5,
    hardcore: false,
  },
  hard: {
    id: 'hard',
    pro: true,
    memorizeSeconds: 3,
    difficulty: 3,
    accent: '#F5A623',
    icon: 'bolt',
    bonus: 10,
    hardcore: false,
  },
  hardcore: {
    id: 'hardcore',
    pro: true,
    memorizeSeconds: 3,
    difficulty: 4,
    accent: '#E8595A',
    icon: 'warning',
    bonus: 15,
    hardcore: true,
  },
};

/** Stable display order for the mode-selection screen. */
export const MODE_ORDER: ModeId[] = ['easy', 'normal', 'hard', 'hardcore'];

/** Number of distractor flashes shown before the hardcore target reveal. */
export const HARDCORE_DISTRACTORS = 7;
/** Duration each hardcore distractor color is shown (ms). */
export const HARDCORE_DISTRACTOR_MS = 450;

/** Free mode used when a selected / persisted mode is Pro-locked. */
export const FREE_FALLBACK_MODE: ModeId = 'normal';

/** True when `id` requires HueMind Pro and the user doesn't have it. */
export function isModeLocked(id: ModeId, premium: boolean): boolean {
  return !premium && MODES[id].pro;
}

/** The mode that may actually be played: locked modes fall back to Normal. */
export function playableMode(id: ModeId, premium: boolean): ModeId {
  return isModeLocked(id, premium) ? FREE_FALLBACK_MODE : id;
}
