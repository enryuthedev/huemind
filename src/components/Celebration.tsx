import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/src/theme';

export type CelebrationIntensity = 'soft' | 'full';

interface CelebrationProps {
  /** When this flips to `true` the burst plays once. */
  active: boolean;
  /** Tint for the rings. Defaults to the theme's primary color. */
  color?: string;
  /** `soft`: two faint rings. `full` (default): four stronger rings, longer. */
  intensity?: CelebrationIntensity;
  style?: StyleProp<ViewStyle>;
}

interface Ring {
  size: number;
  delay: number;
  opacity: number;
}

/** Visual configuration per intensity (size + relative delay + peak opacity). */
const RING_SETS: Record<CelebrationIntensity, ReadonlyArray<Ring>> = {
  soft: [
    { size: 140, delay: 0, opacity: 0.25 },
    { size: 230, delay: 80, opacity: 0.14 },
  ],
  full: [
    { size: 120, delay: 0, opacity: 0.5 },
    { size: 200, delay: 60, opacity: 0.36 },
    { size: 300, delay: 120, opacity: 0.24 },
    { size: 420, delay: 200, opacity: 0.14 },
  ],
};

const MAX_RINGS = Math.max(RING_SETS.soft.length, RING_SETS.full.length);
const DURATION: Record<CelebrationIntensity, number> = { soft: 800, full: 1100 };

/**
 * A decorative soft glow burst. Built on RN's built-in `Animated` only (no
 * particle or reanimated deps, so it bundles in Expo Go). It renders an
 * absolute, pointer-events-none overlay that fills its parent. When `active`
 * flips to true a few translucent, color-tinted concentric rings fade in and
 * scale up, then fade out. While inactive it renders nothing.
 */
export function Celebration({ active, color, intensity = 'full', style }: CelebrationProps) {
  const theme = useTheme();
  const tint = color ?? theme.colors.primary;
  const rings = RING_SETS[intensity];

  // One progress value per ring slot (0 → 1 over the burst).
  const progress = useRef(Array.from({ length: MAX_RINGS }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (!active) return;

    const set = RING_SETS[intensity];
    const animations = set.map((ring, i) =>
      Animated.sequence([
        Animated.delay(ring.delay),
        Animated.timing(progress[i], {
          toValue: 1,
          duration: DURATION[intensity],
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    const burst = Animated.parallel(animations);
    burst.start();

    return () => {
      burst.stop();
      progress.forEach((p) => p.setValue(0));
    };
  }, [active, intensity, progress]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.container, style]}>
      {rings.map((ring, i) => {
        const scale = progress[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0.4, 1],
        });
        const opacity = progress[i].interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [0, ring.opacity, 0],
        });
        return (
          <Animated.View
            key={ring.size}
            style={[
              styles.ring,
              {
                width: ring.size,
                height: ring.size,
                borderRadius: ring.size / 2,
                backgroundColor: tint,
                opacity,
                transform: [{ scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
});
