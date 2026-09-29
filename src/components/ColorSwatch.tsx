import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/theme';
import { AppText } from '@/src/components/AppText';

interface ColorSwatchProps {
  /** Fill color (hex) of the swatch. */
  color: string;
  /** Explicit width; falls back to `size`. */
  width?: number;
  /** Explicit height; falls back to `size`. */
  height?: number;
  /** Square fallback for width/height. */
  size?: number;
  /** Corner radius; falls back to `theme.radius.lg`. */
  radius?: number;
  /** Optional caption rendered below the swatch (uppercased). */
  label?: string;
  /** Soft inner glow ring for a premium, lit look. */
  glow?: boolean;
  /** Container style override. */
  style?: StyleProp<ViewStyle>;
  /** Label color; falls back to `theme.colors.textMuted`. */
  labelColor?: string;
}

/**
 * A rounded, filled color tile — the core visual unit of the game. Optionally
 * shows a subtle inner glow and an uppercase caption beneath it.
 */
export function ColorSwatch({
  color,
  width,
  height,
  size = 140,
  radius,
  label,
  glow = false,
  style,
  labelColor,
}: ColorSwatchProps) {
  const theme = useTheme();

  const w = width ?? size;
  const h = height ?? size;
  const r = radius ?? theme.radius.lg;

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.swatch,
          glow && theme.shadow,
          {
            width: w,
            height: h,
            borderRadius: r,
            backgroundColor: color,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {glow ? (
          <View
            pointerEvents="none"
            style={[
              styles.glow,
              {
                borderRadius: Math.max(r - 6, 0),
                borderColor: 'rgba(255,255,255,0.35)',
              },
            ]}
          />
        ) : null}
      </View>

      {label ? (
        <AppText
          variant="label"
          color={labelColor ?? theme.colors.textMuted}
          numberOfLines={1}
          style={styles.label}
        >
          {label.toUpperCase()}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  swatch: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderWidth: 1,
  },
  label: {
    marginTop: 8,
    textAlign: 'center',
  },
});
