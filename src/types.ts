// Shared domain types for HueMind.

export type ModeId = 'easy' | 'normal' | 'hard' | 'hardcore';

export type ThemeMode = 'system' | 'light' | 'dark';

export type Language = 'system' | 'de' | 'en' | 'es';

/** HSV color, h in [0,360), s/v in [0,1]. */
export interface HSV {
  h: number;
  s: number;
  v: number;
}

/** RGB color, each channel in [0,255]. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** A single completed round. */
export interface RoundResult {
  id: string;
  mode: ModeId;
  /** Original target color as #RRGGBB. */
  target: string;
  /** The color the player picked as #RRGGBB. */
  guess: string;
  /** Accuracy score 0-100 (mode bonus is tracked separately in `modeBonus`). */
  score: number;
  /** Perceptual CIEDE2000 distance between target and guess. */
  deltaE: number;
  /** Human-facing color deviation in percent (0 = perfect). */
  deviationPct: number;
  /** Time from picker shown to confirm, in milliseconds. */
  reactionMs: number;
  /** Points added for the chosen mode's difficulty. */
  modeBonus: number;
  /** Epoch milliseconds when the round finished. */
  timestamp: number;
  /** Which flow produced the round (absent on older rounds = 'normal'). */
  source?: RoundSource;
}

export type RoundSource = 'normal' | 'daily' | 'training';

/** Progress of the Daily Challenge for one local calendar day. */
export interface DailyState {
  /** Day key 'YYYY-MM-DD' the results belong to ('' = never played). */
  date: string;
  /** Scores (0-100) of the rounds played that day, in order. */
  results: number[];
  completed: boolean;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  themeMode: ThemeMode;
  /** Farbenblind-Modus: adds labels / patterns to aid color-blind users. */
  colorBlind: boolean;
  /** Schwierigkeitsdetails anzeigen: show numeric deltaE / hex details. */
  showDifficultyDetails: boolean;
  language: Language;
}

export interface Stats {
  /** All rounds, oldest first. */
  history: RoundResult[];
  bestScore: number;
  /** Current consecutive-day streak. */
  streak: number;
  /** Last day a round was played, 'YYYY-MM-DD'. */
  lastPlayedDay: string | null;
}

/**
 * The most recent round plus meta captured at record time (not stored in
 * history). `prevBest` is the best score *before* this round.
 */
export interface LastResult extends RoundResult {
  prevBest: number;
  /** True when this round beat the previous best (and scored > 0). */
  isNewBest: boolean;
}

export interface GameState {
  selectedMode: ModeId;
  /** Target color for the in-progress round, #RRGGBB. */
  target: string | null;
  /** Most recent finished round, used by the result screen. */
  lastResult: LastResult | null;
}

/** Static configuration for a difficulty mode. */
export interface ModeConfig {
  id: ModeId;
  /** i18n key suffix; names live under modes.<id>.* */
  memorizeSeconds: number;
  /** Filled difficulty dots out of 4. */
  difficulty: number;
  /** Subtle accent color (#RRGGBB) used for borders / highlights. */
  accent: string;
  /** Material symbol name for the card icon. */
  icon: string;
  /** Bonus points granted for completing a round in this mode. */
  bonus: number;
  /** Hardcore shows distractor colors before revealing the target. */
  hardcore: boolean;
}
