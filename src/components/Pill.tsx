import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/theme';
import { hexToRgb } from '@/src/utils/color';
import { AppText } from '@/src/components/AppText';

export type PillTone = 'default' | 'accent' | 'error';

export interface PillProps {
  label: string;
  tone?: PillTone;
  /** Hex accent color used when `tone='accent'`. Falls back to the theme text color. */
  accent?: string;
  style?: StyleProp<ViewStyle>;
}

export function Pill({ label, tone = 'default', accent, style }: PillProps) {
  const theme = useTheme();
  const { colors } = theme;

  let backgroundColor: string = colors.inset;
  let textColor: string = colors.textMuted;

  if (tone === 'accent') {
    const base = accent ?? colors.text;
    const rgb = hexToRgb(base);
    backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`;
    textColor = base;
  } else if (tone === 'error') {
    backgroundColor = colors.errorContainer;
    textColor = colors.onErrorContainer;
  }

  return (
    <View
      style={[styles.pill, { backgroundColor, borderRadius: theme.radius.full }, style]}
    >
      <AppText variant="label" color={textColor} numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexShrink: 1,
    maxWidth: '100%',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  label: {
    textTransform: 'uppercase',
  },
});
