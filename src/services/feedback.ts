import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useStore } from '@/src/store/useStore';

/**
 * Haptic + sound feedback service.
 *
 * - Haptics are provided by `expo-haptics` and gated by `settings.haptics`.
 * - Every call is guarded with `Platform.OS !== 'web'` and swallows promise
 *   rejections, so it is a safe no-op on web and never surfaces an unhandled
 *   rejection on unsupported devices.
 * - Sound is intentionally not wired yet: a placeholder gated by `settings.sound`
 *   is left below for a future `expo-audio` integration (no sound imports here,
 *   keeping the bundle Expo Go compatible).
 */

function hapticsEnabled(): boolean {
  return Platform.OS !== 'web' && useStore.getState().settings.haptics;
}

/** Fire-and-forget a haptic promise — haptics are best-effort. */
function run(fn: () => Promise<void>): void {
  if (!hapticsEnabled()) return;
  try {
    fn().catch(() => {});
  } catch {
    // ignore — synchronous failures on exotic devices
  }
}

// Sound placeholder: when wired (expo-audio later), gate playback on
// `useStore.getState().settings.sound`. No sound imports for now.

export const feedback = {
  tap(): void {
    run(() => Haptics.selectionAsync());
  },

  /** Very light "tick" — e.g. while dragging a slider across hue steps. */
  selection(): void {
    run(() => Haptics.selectionAsync());
  },

  select(): void {
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },

  success(): void {
    run(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    );
  },

  warning(): void {
    run(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    );
  },

  error(): void {
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
};
