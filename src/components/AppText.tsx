import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { useTheme, type Theme } from '@/src/theme';

type Variant = keyof Theme['typography'];

interface AppTextProps
  extends Pick<
    TextProps,
    | 'numberOfLines'
    | 'adjustsFontSizeToFit'
    | 'minimumFontScale'
    | 'ellipsizeMode'
    | 'accessibilityRole'
    | 'accessibilityLabel'
    | 'onLayout'
  > {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
  onPress?: () => void;
  /** Override the Dynamic Type cap (defaults: 1.2 for display/headlines, 1.3 otherwise). */
  maxFontSizeMultiplier?: number;
}

/** Large variants get a tighter accessibility-scaling cap so layouts stay intact. */
const LARGE_VARIANTS: ReadonlySet<Variant> = new Set<Variant>([
  'display',
  'headlineLg',
  'headlineMd',
]);

/**
 * Themed text primitive. Resolves a typography preset by `variant`, applies the
 * theme's default text color (overridable) and optional alignment, then lets
 * callers layer extra styles via `style`. Every piece of copy in the app flows
 * through this so weights, sizes and color react to light/dark automatically.
 * System font scaling is capped (1.3×, 1.2× for display/headline variants).
 */
export function AppText({
  variant = 'body',
  color,
  align,
  style,
  children,
  onPress,
  maxFontSizeMultiplier,
  ...textProps
}: AppTextProps) {
  const theme = useTheme();

  return (
    <Text
      {...textProps}
      onPress={onPress}
      maxFontSizeMultiplier={
        maxFontSizeMultiplier ?? (LARGE_VARIANTS.has(variant) ? 1.2 : 1.3)
      }
      style={[
        theme.typography[variant],
        { color: color ?? theme.colors.text },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
