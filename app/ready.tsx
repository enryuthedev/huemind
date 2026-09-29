import { useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/src/theme';
import { useStore } from '@/src/store/useStore';
import { MODES, FREE_FALLBACK_MODE, isModeLocked } from '@/src/constants/modes';
import { usePremium } from '@/src/services/purchases';
import { AppText } from '@/src/components/AppText';
import { AppButton } from '@/src/components/AppButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';

/**
 * Pre-round "get ready" screen.
 *
 * Reads the currently selected mode from the store, shows a brief summary
 * (short name + memorize time), and starts the round with
 * `router.replace('/game')` so this transient screen is not left in the
 * history. The close button simply pops back to wherever the player came from.
 *
 * Pro gate: a persisted Pro mode (Schwer / Hardcore) without HueMind Pro is
 * reset to Normal on mount; starting a locked mode opens the paywall instead.
 */
export default function ReadyScreen(): React.JSX.Element {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();
  const { t } = useTranslation();
  const starting = useRef(false);

  const storedMode = useStore((s) => s.game.selectedMode);
  const setMode = useStore((s) => s.setMode);
  const premium = usePremium();
  const locked = isModeLocked(storedMode, premium);
  const mode = locked ? FREE_FALLBACK_MODE : storedMode;
  const config = MODES[mode];

  // Never let a locked mode reach the game screen (it reads the store).
  useEffect(() => {
    if (locked) setMode(FREE_FALLBACK_MODE);
  }, [locked, setMode]);

  const close = (): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  };

  const start = (): void => {
    if (starting.current) return;
    const state = useStore.getState();
    if (isModeLocked(state.game.selectedMode, state.premium)) {
      router.push({ pathname: '/paywall', params: { source: 'mode' } });
      return;
    }
    starting.current = true;
    router.replace('/game');
  };

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    theme.shadow,
    {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderColor: colors.border,
      padding: spacing.lg,
      marginTop: spacing.xl,
    },
  ];

  return (
    <ScreenContainer scroll>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={12}
          onPress={close}
          style={({ pressed }) => [
            styles.close,
            {
              backgroundColor: colors.inset,
              borderRadius: radius.full,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <MaterialIcons name="close" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.center}>
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.iconChip,
              { backgroundColor: colors.inset, borderRadius: radius.full },
            ]}
          >
            <MaterialIcons name="palette" size={36} color={colors.text} />
          </View>

          <AppText
            variant="display"
            align="center"
            accessibilityRole="header"
            style={{ marginTop: spacing.xl }}
          >
            {t('ready.title')}
          </AppText>

          <AppText
            variant="bodyLg"
            align="center"
            color={colors.textMuted}
            style={[styles.subline, { marginTop: spacing.sm }]}
          >
            {t('ready.subline')}
          </AppText>

          <View style={cardStyle}>
            <View style={styles.row}>
              <AppText variant="label" color={colors.textMuted} style={styles.shrink}>
                {t('ready.modeLabel')}
              </AppText>
              <AppText variant="bodyMedium" style={styles.value}>
                {t(`modes.${mode}.short`)}
              </AppText>
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: colors.border, marginVertical: spacing.md },
              ]}
            />

            <View style={styles.row}>
              <AppText variant="label" color={colors.textMuted} style={styles.shrink}>
                {t('ready.timeLabel')}
              </AppText>
              <AppText variant="bodyMedium" style={styles.value}>
                {`${config.memorizeSeconds} ${t('common.seconds')}`}
              </AppText>
            </View>
          </View>
        </View>

        <AppButton
          label={t('ready.start')}
          icon="arrow-forward"
          iconPosition="right"
          onPress={start}
          style={{ marginTop: spacing.xl }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 16,
  },
  center: {
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  subline: {
    maxWidth: 420,
  },
  iconChip: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignSelf: 'stretch',
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  shrink: {
    flexShrink: 1,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
