import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import { AppText } from '@/src/components/AppText';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface StatCardProps {
  icon?: MaterialIconName;
  label: string;
  value: string | number;
  /** Use tighter padding (small screens). */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Compact stat tile: an optional icon, an uppercase muted label and a bold
 * value, centered on a soft card. Used in the home and progress screens.
 */
export function StatCard({ icon, label, value, compact = false, style }: StatCardProps) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[
        styles.card,
        theme.shadow,
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.md,
          paddingVertical: compact ? theme.spacing.sm + 2 : theme.spacing.md,
          paddingHorizontal: theme.spacing.sm,
        },
        style,
      ]}
    >
      {icon ? (
        <MaterialIcons
          name={icon}
          size={compact ? 20 : 22}
          color={theme.colors.textMuted}
          style={styles.icon}
        />
      ) : null}

      <AppText
        variant="label"
        color={theme.colors.textMuted}
        align="center"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={styles.label}
      >
        {label.toUpperCase()}
      </AppText>

      <AppText
        variant="headlineMd"
        align="center"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={styles.value}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    alignSelf: 'stretch',
  },
  value: {
    alignSelf: 'stretch',
    marginTop: 2,
  },
});
