import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme } from '@/src/theme';
import { feedback } from '@/src/services/feedback';
import { AppText } from '@/src/components/AppText';

/** Presses arriving within this window after an accepted press are ignored. */
const PRESS_THROTTLE_MS = 600;

type Variant = 'primary' | 'secondary' | 'ghost';
type IconName = keyof typeof MaterialIcons.glyphMap;
type IconPosition = 'left' | 'right';

export interface AppButtonProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: Variant;
  icon?: IconName;
  iconPosition?: IconPosition;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Screen-reader label; required when `label` is empty (icon-only button). */
  accessibilityLabel?: string;
}

/**
 * Primary action button.
 *
 * - `Pressable` with an `Animated` press-scale to 0.98 on press-in.
 * - Calls `feedback.select()` on press (light haptic, gated by settings).
 * - Three tonal variants resolved from the active theme palette.
 */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  disabled = false,
  full = true,
  style,
  accessibilityLabel,
}: AppButtonProps): React.JSX.Element {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const lastPressAt = useRef(0);

  const backgroundColor =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'secondary'
        ? theme.colors.secondaryBtn
        : 'transparent';

  const contentColor =
    variant === 'primary'
      ? theme.colors.onPrimary
      : variant === 'secondary'
        ? theme.colors.onSecondaryBtn
        : theme.colors.textMuted;

  function animateTo(value: number): void {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }

  function handlePress(event: GestureResponderEvent): void {
    // Double-tap guard: avoid pushing the same screen twice / double-submits.
    const now = Date.now();
    if (now - lastPressAt.current < PRESS_THROTTLE_MS) return;
    lastPressAt.current = now;
    feedback.select();
    onPress?.(event);
  }

  const iconNode = icon ? (
    <MaterialIcons name={icon} size={20} color={contentColor} />
  ) : null;

  return (
    <Animated.View
      style={[
        full ? styles.full : undefined,
        { transform: [{ scale }] },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={handlePress}
        onPressIn={() => animateTo(0.98)}
        onPressOut={() => animateTo(1)}
        style={[
          styles.button,
          label ? null : styles.iconOnly,
          {
            backgroundColor,
            borderRadius: theme.radius.lg,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <View style={styles.content}>
          {iconPosition === 'left' ? iconNode : null}
          {label ? (
          <AppText
            variant="title"
            color={contentColor}
            align="center"
            numberOfLines={2}
            style={styles.label}
          >
            {label}
          </AppText>
          ) : null}
          {iconPosition === 'right' ? iconNode : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  full: {
    alignSelf: 'stretch',
  },
  button: {
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOnly: {
    paddingHorizontal: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  label: {
    flexShrink: 1,
  },
});
