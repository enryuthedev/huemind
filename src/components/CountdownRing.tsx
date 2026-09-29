import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import { AppText } from '@/src/components/AppText';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CountdownRingProps {
  seconds: number;
  running?: boolean;
  onComplete?: () => void;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}

/**
 * A circular countdown built on `react-native-svg`. A progress `Circle` is
 * driven by an `Animated.Value` (0→1) feeding `strokeDashoffset`, depleting
 * linearly over `seconds * 1000` ms. The ring is rotated -90° so it starts at
 * the top. The centre shows the remaining whole seconds (or a custom `label`).
 *
 * `onComplete` fires exactly once when the ring empties. Setting `running` to
 * false pauses the animation in place; setting it back to true resumes from the
 * remaining duration. Changing `seconds` restarts the countdown. All native
 * animations are stopped and listeners removed on unmount.
 */
export function CountdownRing({
  seconds,
  running = true,
  onComplete,
  size = 120,
  stroke = 8,
  color,
  trackColor,
  label,
}: CountdownRingProps) {
  const theme = useTheme();

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const progress = useRef(new Animated.Value(0)).current;
  const currentValueRef = useRef(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Whole seconds shown in the centre. Only updated when the displayed number
  // actually changes, so the listener does not re-render every frame — the ring
  // itself is driven purely by the Animated value.
  const [remaining, setRemaining] = useState(() => Math.ceil(seconds));
  const remainingRef = useRef(Math.ceil(seconds));

  // Track the animated value to derive the centre number and to know how much
  // time is left when pausing / resuming.
  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      currentValueRef.current = value;
      const next = Math.ceil(Math.max(0, seconds * (1 - value)));
      if (next !== remainingRef.current) {
        remainingRef.current = next;
        setRemaining(next);
      }
    });
    return () => progress.removeListener(id);
  }, [progress, seconds]);

  // Restart whenever the duration changes.
  useEffect(() => {
    completedRef.current = false;
    currentValueRef.current = 0;
    progress.setValue(0);
    remainingRef.current = Math.ceil(seconds);
    setRemaining(Math.ceil(seconds));
  }, [progress, seconds]);

  // Drive / pause the animation.
  useEffect(() => {
    if (!running || completedRef.current) {
      return;
    }
    const remainingMs = seconds * 1000 * (1 - currentValueRef.current);
    if (remainingMs <= 0) {
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: remainingMs,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished && !completedRef.current) {
        completedRef.current = true;
        remainingRef.current = 0;
        setRemaining(0);
        onCompleteRef.current?.();
      }
    });
    return () => animation.stop();
  }, [progress, running, seconds]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, circumference],
  });

  const ringColor = color ?? theme.colors.text;
  const track = trackColor ?? theme.colors.inset;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="none"
        />
      </Svg>
      <AppText variant="headlineLg" color={ringColor}>
        {label ?? String(remaining)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  svg: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  } satisfies ViewStyle,
});
