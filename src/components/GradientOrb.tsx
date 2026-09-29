import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/src/theme';

export interface GradientOrbProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * GradientOrb — a perfectly round, multi-stop LinearGradient orb with a soft
 * inner highlight and a slow, looping rotation overlay for a calm "living"
 * feel. Pure RN `Animated` (no reanimated, no external animation deps) so it
 * bundles cleanly in Expo Go.
 */
export function GradientOrb({ size = 200, style }: GradientOrbProps) {
  const theme = useTheme();
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      rotation.setValue(0);
    };
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const round: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    // Shadow lives on the outer wrapper (overflow must stay visible for it to
    // render on iOS); the inner view clips the gradients to a circle.
    // A solid background gives Android's elevation an outline to cast from.
    <View
      style={[round, styles.outer, theme.shadow, style]}
      pointerEvents="none"
    >
      <View style={[styles.container, round]}>
        {/* Base diagonal gradient */}
        <LinearGradient
          colors={['#FF6B6B', '#4ECDC4', '#45B7D1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Slowly rotating translucent overlay for gentle motion */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin }] }]}
        >
          <LinearGradient
            colors={[
              'rgba(255,255,255,0.28)',
              'rgba(255,255,255,0)',
              'rgba(0,0,0,0.18)',
            ]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Soft inner highlight — an inset glow in the upper-left quadrant */}
        <LinearGradient
          colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 0.7 }}
          style={[
            styles.innerGlow,
            {
              top: size * 0.1,
              left: size * 0.1,
              width: size * 0.55,
              height: size * 0.55,
              borderRadius: size * 0.275,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#4ECDC4',
  },
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerGlow: {
    position: 'absolute',
  },
});
