import { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import { AppText } from '@/src/components/AppText';

type IconName = keyof typeof MaterialIcons.glyphMap;

export interface SettingRowProps {
  /** Leading MaterialIcons glyph shown in a round chip. */
  icon: IconName;
  /** Primary label text (already translated via t(...)). */
  label: string;
  /** Optional secondary description line (already translated). */
  description?: string;
  /** Trailing node — e.g. a Switch or chips. Falls back to a chevron when pressable. */
  right?: ReactNode;
  /** Makes the whole row pressable. */
  onPress?: () => void;
  /** First row in its grouped card. */
  isFirst?: boolean;
  /** Last row in its grouped card — suppresses the hairline separator. */
  isLast?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A single row inside a grouped settings card. The row itself is transparent —
 * the screen is responsible for wrapping rows in a card surface.
 */
export function SettingRow({
  icon,
  label,
  description,
  right,
  onPress,
  isFirst,
  isLast,
  style,
}: SettingRowProps) {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;

  const trailing: ReactNode =
    right ??
    (onPress ? (
      <MaterialIcons name="chevron-right" size={22} color={colors.textFaint} />
    ) : null);

  const content = (
    <View
      style={[
        styles.row,
        {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconChip,
          {
            width: 40,
            height: 40,
            borderRadius: radius.full,
            backgroundColor: colors.inset,
            marginRight: spacing.md,
          },
        ]}
      >
        <MaterialIcons name={icon} size={20} color={colors.text} />
      </View>

      <View style={styles.textCol}>
        <AppText variant="bodyMedium" numberOfLines={2}>
          {label}
        </AppText>
        {description ? (
          <AppText
            variant="caption"
            color={colors.textMuted}
            numberOfLines={2}
            style={{ marginTop: spacing.xs / 2 }}
          >
            {description}
          </AppText>
        ) : null}
      </View>

      {trailing ? (
        <View style={[styles.trailing, { marginLeft: spacing.md }]}>{trailing}</View>
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={description ? `${label}, ${description}` : label}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  iconChip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  trailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
