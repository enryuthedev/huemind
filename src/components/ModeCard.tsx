import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme';
import type { ModeConfig } from '@/src/types';
import { DifficultyDots } from '@/src/components/DifficultyDots';
import { Pill } from '@/src/components/Pill';
import { AppText } from '@/src/components/AppText';

interface ModeCardProps {
  mode: ModeConfig;
  selected: boolean;
  onPress: () => void;
  /** Pro mode without HueMind Pro: shows a lock + "PRO" pill. */
  locked?: boolean;
}

/**
 * Selectable difficulty card used on the mode-select screen. Shows the mode's
 * icon, difficulty dots, name, memorize time and a tagline pill. When selected
 * the card gains a 2px accent border and a larger ambient shadow. The hardcore
 * mode renders its tagline pill in the `error` tone for extra emphasis.
 */
export function ModeCard({ mode, selected, onPress, locked = false }: ModeCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const name = t(`modes.${mode.id}.name`);
  const memorize = t('modeSelect.secondsToMemorize', { count: mode.memorizeSeconds });

  // Selected cards get a stronger shadow than the default ambient elevation.
  const selectedShadow: ViewStyle = {
    shadowColor: '#000000',
    shadowOpacity: theme.colors.scheme === 'dark' ? 0.5 : 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected, checked: selected }}
        accessibilityLabel={
          locked ? `${name}, ${memorize}, ${t('pro.lockedA11y')}` : `${name}, ${memorize}`
        }
        onPress={onPress}
        onPressIn={() => animateTo(0.99)}
        onPressOut={() => animateTo(1)}
        style={[
          styles.card,
          selected ? selectedShadow : theme.shadow,
          {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.xl,
            padding: theme.spacing.lg,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? mode.accent : theme.colors.border,
          },
        ]}
      >
        {/* Top row: mode icon + difficulty dots */}
        <View style={styles.topRow}>
          <MaterialIcons
            name={mode.icon as keyof typeof MaterialIcons.glyphMap}
            size={26}
            color={mode.accent}
          />
          <View style={styles.topRight}>
            {locked ? (
              <View
                style={[
                  styles.proPill,
                  {
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.radius.full,
                  },
                ]}
              >
                <MaterialIcons name="lock" size={12} color={theme.colors.onPrimary} />
                <AppText variant="label" color={theme.colors.onPrimary}>
                  {t('pro.badge')}
                </AppText>
              </View>
            ) : null}
            <DifficultyDots filled={mode.difficulty} color={mode.accent} />
          </View>
        </View>

        <AppText
          variant="headlineMd"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{ marginTop: theme.spacing.md }}
        >
          {name}
        </AppText>

        <AppText
          variant="body"
          color={theme.colors.textMuted}
          style={{ marginTop: theme.spacing.xs }}
        >
          {memorize}
        </AppText>

        <View style={[styles.pillRow, { marginTop: theme.spacing.md }]}>
          <Pill
            label={t(`modes.${mode.id}.tagline`)}
            tone={mode.hardcore ? 'error' : 'accent'}
            accent={mode.accent}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
