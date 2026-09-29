import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/src/components/AppButton';
import { AppHeader } from '@/src/components/AppHeader';
import { AppText } from '@/src/components/AppText';
import { ColorSwatch } from '@/src/components/ColorSwatch';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useMidnightCountdown } from '@/src/components/DailyCard';
import { useStore } from '@/src/store/useStore';
import { useTheme } from '@/src/theme';
import {
  DAILY_MAX,
  dailyNumber,
  dailyTargets,
  scoreEmoji,
  sumScores,
} from '@/src/utils/daily';
import { shareDaily } from '@/src/utils/share';

/**
 * Daily Challenge summary — shown after the 5th daily color (and from the home
 * card once completed): total out of 500, the day's colors with their scores,
 * the shareable emoji row and a countdown to tomorrow's colors.
 */
export default function DailySummaryScreen(): React.JSX.Element | null {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const daily = useStore((s) => s.daily);
  const countdown = useMidnightCountdown();

  useEffect(() => {
    if (!daily.completed) {
      router.dismissTo('/home');
    }
  }, [daily.completed, router]);

  const targets = useMemo(() => (daily.date ? dailyTargets(daily.date) : []), [daily.date]);

  if (!daily.completed) {
    return null;
  }

  const total = sumScores(daily.results);
  const goHome = () => router.dismissTo('/home');
  const content = Math.min(width, 560) - theme.spacing.containerPadding * 2;
  const swatch = Math.floor(Math.max(36, Math.min(56, (content - 4 * 8) / 5)));

  return (
    <ScreenContainer scroll>
      <AppHeader showBack onBack={goHome} title={t('daily.title')} />

      <View style={styles.hero}>
        <AppText variant="label" color={theme.colors.textMuted} align="center">
          {t('daily.summaryTitle', { n: dailyNumber(daily.date) }).toUpperCase()}
        </AppText>
        <View style={styles.scoreRow}>
          <AppText variant="display">{total}</AppText>
          <AppText variant="headlineMd" color={theme.colors.textMuted} style={styles.scoreMax}>
            {` / ${DAILY_MAX}`}
          </AppText>
        </View>
        <AppText
          align="center"
          style={styles.emoji}
          accessibilityLabel={daily.results.join(', ')}
        >
          {daily.results.map(scoreEmoji).join(' ')}
        </AppText>
      </View>

      <View style={styles.swatches}>
        {daily.results.map((score, i) => (
          <View key={i} style={styles.swatchCol}>
            <ColorSwatch color={targets[i] ?? '#808080'} size={swatch} radius={theme.radius.sm} />
            <AppText variant="caption" color={theme.colors.textMuted} align="center">
              {score}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.tomorrow}>
        <AppText variant="bodyMedium" align="center">
          {t('daily.tomorrow')}
        </AppText>
        <AppText variant="caption" color={theme.colors.textMuted} align="center">
          {t('daily.newIn', { time: countdown })}
        </AppText>
      </View>

      <View style={styles.actions}>
        <AppButton
          label={t('daily.share')}
          icon="share"
          onPress={() => void shareDaily(daily.date, daily.results)}
        />
        <AppButton label={t('result.home')} variant="ghost" icon="home" onPress={goHome} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginTop: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  scoreMax: {
    marginLeft: 4,
  },
  emoji: {
    fontSize: 28,
    lineHeight: 38,
    marginTop: 12,
  },
  swatches: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  swatchCol: {
    alignItems: 'center',
    gap: 4,
  },
  tomorrow: {
    marginTop: 28,
    gap: 2,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: 28,
    gap: 12,
  },
});
