import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/theme';

interface DifficultyDotsProps {
  /** Number of leading dots rendered in the accent/fill color. */
  filled: number;
  /** Total dots in the row. */
  total?: number;
  /** Fill color for the leading dots; defaults to the theme text color. */
  color?: string;
  /** Diameter of each dot in px. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A compact row of dots used to convey a mode's difficulty. The first `filled`
 * dots use `color` (or the theme text color), the rest fall back to the border
 * color. Purely decorative — no user-facing text.
 */
export function DifficultyDots({
  filled,
  total = 4,
  color,
  size = 8,
  style,
}: DifficultyDotsProps) {
  const theme = useTheme();
  const fillColor = color ?? theme.colors.text;

  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: i < filled ? fillColor : theme.colors.border,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
