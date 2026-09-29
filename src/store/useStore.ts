import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  DailyState,
  GameState,
  Language,
  ModeId,
  RoundResult,
  Settings,
  Stats,
} from '@/src/types';
import { applyLanguage } from '@/src/i18n';
import { dayKey, previousDayKey } from '@/src/store/selectors';
import { DAILY_ROUNDS } from '@/src/utils/daily';

/** Maximum number of rounds kept in history. */
const HISTORY_CAP = 500;

const DEFAULT_SETTINGS: Settings = {
  sound: true,
  haptics: true,
  themeMode: 'light',
  colorBlind: false,
  showDifficultyDetails: false,
  language: 'system',
};

const DEFAULT_STATS: Stats = {
  history: [],
  bestScore: 0,
  streak: 0,
  lastPlayedDay: null,
};

const DEFAULT_GAME: GameState = {
  selectedMode: 'normal',
  target: null,
  lastResult: null,
};

const DEFAULT_DAILY: DailyState = { date: '', results: [], completed: false };

const MODE_IDS: readonly ModeId[] = ['easy', 'normal', 'hard', 'hardcore'];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export interface StoreState {
  hydrated: boolean;
  premium: boolean;
  settings: Settings;
  stats: Stats;
  game: GameState;
  daily: DailyState;
  /** Epoch ms when the Pro upsell card was last shown (null = never). */
  lastUpsellAt: number | null;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setLanguage: (language: Language) => void;
  setPremium: (v: boolean) => void;
  setMode: (mode: ModeId) => void;
  setTarget: (hex: string | null) => void;
  /**
   * Record a finished round. For daily rounds pass the day key the target was
   * generated for (`dailyDate`) so a round crossing midnight still lands on
   * the right day.
   */
  recordResult: (result: RoundResult, opts?: { dailyDate?: string }) => void;
  markUpsellShown: (at?: number) => void;
  resetStats: () => void;
}

/** Shape written to AsyncStorage. */
interface PersistedState {
  settings: Settings;
  stats: Stats;
  premium: boolean;
  game: Pick<GameState, 'selectedMode'>;
  daily: DailyState;
  lastUpsellAt: number | null;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      premium: false,
      settings: { ...DEFAULT_SETTINGS },
      stats: { ...DEFAULT_STATS, history: [] },
      game: { ...DEFAULT_GAME },
      daily: { ...DEFAULT_DAILY, results: [] },
      lastUpsellAt: null,

      setSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),

      setLanguage: (language) => {
        set((state) => ({
          settings: { ...state.settings, language },
        }));
        applyLanguage(language);
      },

      setPremium: (v) => set({ premium: v }),

      setMode: (mode) =>
        set((state) => ({
          game: { ...state.game, selectedMode: mode },
        })),

      setTarget: (hex) =>
        set((state) => ({
          game: { ...state.game, target: hex },
        })),

      recordResult: (result, opts) => {
        const { stats, game, daily: prevDaily } = get();

        let daily = prevDaily;
        if (result.source === 'daily') {
          const date = opts?.dailyDate ?? dayKey(result.timestamp);
          const base = prevDaily.date === date ? prevDaily.results : [];
          if (base.length < DAILY_ROUNDS) {
            const results = [...base, result.score];
            daily = { date, results, completed: results.length >= DAILY_ROUNDS };
          }
        }

        const history = [...stats.history, result];
        if (history.length > HISTORY_CAP) {
          history.splice(0, history.length - HISTORY_CAP);
        }

        const prevBest = stats.bestScore;
        const isNewBest = result.score > prevBest && result.score > 0;
        const bestScore = Math.max(prevBest, result.score);

        // Calendar-based day keys (DST-safe): yesterday = local date − 1 day.
        const today = dayKey(result.timestamp);
        const yesterday = previousDayKey(result.timestamp);

        let streak: number;
        if (stats.lastPlayedDay === today) {
          streak = Math.max(1, stats.streak);
        } else if (stats.lastPlayedDay === yesterday) {
          streak = stats.streak + 1;
        } else {
          streak = 1;
        }

        set({
          stats: {
            history,
            bestScore,
            streak,
            lastPlayedDay: today,
          },
          game: { ...game, lastResult: { ...result, prevBest, isNewBest } },
          daily,
        });
      },

      markUpsellShown: (at = Date.now()) => set({ lastUpsellAt: at }),

      resetStats: () =>
        set((state) => ({
          stats: { ...DEFAULT_STATS, history: [] },
          daily: { ...DEFAULT_DAILY, results: [] },
          game: { ...state.game, lastResult: null },
        })),
    }),
    {
      name: 'huemind-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedState => ({
        settings: state.settings,
        stats: state.stats,
        premium: state.premium,
        game: { selectedMode: state.game.selectedMode },
        daily: state.daily,
        lastUpsellAt: state.lastUpsellAt,
      }),
      // v0 -> v1: light mode is now the default. Flip installs that were still
      // on the old 'system' default so the app starts in light mode.
      migrate: (persisted, version) => {
        const state = (isObject(persisted) ? persisted : {}) as Partial<PersistedState>;
        if (version < 1 && state.settings?.themeMode === 'system') {
          state.settings = { ...state.settings, themeMode: 'light' };
        }
        return (state ?? {}) as StoreState;
      },
      // Deep-merge persisted slices over defaults so keys added in later
      // versions (new settings, new stats fields) are never undefined.
      merge: (persisted, current) => {
        const p = (isObject(persisted) ? persisted : {}) as Partial<PersistedState>;
        const settings: Settings = {
          ...DEFAULT_SETTINGS,
          ...current.settings,
          ...(isObject(p.settings) ? p.settings : {}),
        };
        const pStats = isObject(p.stats) ? (p.stats as Partial<Stats>) : {};
        const stats: Stats = {
          ...DEFAULT_STATS,
          ...current.stats,
          ...pStats,
          history: Array.isArray(pStats.history) ? pStats.history : current.stats.history,
        };
        const pMode = isObject(p.game) ? p.game.selectedMode : undefined;
        const selectedMode =
          pMode && MODE_IDS.includes(pMode) ? pMode : current.game.selectedMode;
        const pDaily = isObject(p.daily) ? (p.daily as Partial<DailyState>) : null;
        const daily: DailyState =
          pDaily && typeof pDaily.date === 'string' && Array.isArray(pDaily.results)
            ? {
                date: pDaily.date,
                results: pDaily.results.filter((n): n is number => typeof n === 'number'),
                completed: pDaily.completed === true,
              }
            : current.daily;
        return {
          ...current,
          daily,
          lastUpsellAt:
            typeof p.lastUpsellAt === 'number' ? p.lastUpsellAt : current.lastUpsellAt,
          premium: typeof p.premium === 'boolean' ? p.premium : current.premium,
          settings,
          stats,
          game: { ...current.game, selectedMode },
        };
      },
      onRehydrateStorage: () => (state, error) => {
        // Always unblock the UI — also when reading storage failed.
        useStore.setState({ hydrated: true });
        if (error) {
          console.warn('[huemind] store rehydration failed', error);
        }
        applyLanguage((state ?? useStore.getState()).settings.language);
      },
    },
  ),
);
