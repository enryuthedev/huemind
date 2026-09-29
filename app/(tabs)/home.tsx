import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/src/theme';
import { useStore } from '@/src/store/useStore';
import { currentStreak, roundsPlayed } from '@/src/store/selectors';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { GradientOrb } from '@/src/components/GradientOrb';
import { AppText } from '@/src/components/AppText';
import { AppButton } from '@/src/components/AppButton';
import { StatCard } from '@/src/components/StatCard';
import { DailyCard, todayDaily } from '@/src/components/DailyCard';
import { shareDaily } from '@/src/utils/share';

/** Group integers with locale thousands separators (e.g. 12 540 → "12.540"). */
function formatNumber(value: number): string {
  return value.toLocaleString();
}

/** Below this window height (dp) the hero switches to tighter spacing. */
const COMPACT_HEIGHT = 800;

/**
 * Home — the app's warm landing screen: brand wordmark, a calm decorative
 * GradientOrb, the headline pitch, the two primary entry points (play / modes),
 * the slim Daily Challenge card and a row of three live stat tiles read from
 * the persisted store.
 *
 * The orb scales with the window height and spacing tightens on short phones
 * so the stat row stays fully visible above the tab bar without scrolling.
 */
export default function HomeScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();

  const stats = useStore((s) => s.stats);
  const daily = useStore((s) => s.daily);

  const compact = height < COMPACT_HEIGHT;
  const orbSize = Math.round(Math.min(180, Math.max(96, height * 0.16)));

  const gap = compact ? theme.spacing.lg : theme.spacing.xl;

  const openDaily = () => {
    const today = todayDaily(daily);
    if (today.completed) {
      router.push('/daily-summary');
    } else {
      router.push({
        pathname: '/game',
        params: { daily: '1', dailyRound: String(today.played) },
      });
    }
  };
  const shareToday = () => {
    const today = todayDaily(daily);
    void shareDaily(today.date, today.results);
  };

  return (
    <ScreenContainer
      scroll
      edges={['top']}
      contentStyle={[
        styles.content,
        { gap, paddingVertical: compact ? theme.spacing.md : theme.spacing.xl },
      ]}
    >
      <View style={styles.hero}>
        <AppText
          variant="label"
          color={theme.colors.textMuted}
          align="center"
          style={{ marginBottom: compact ? theme.spacing.md : theme.spacing.xl }}
        >
          {t('common.appName').toUpperCase()}
        </AppText>

        <GradientOrb
          size={orbSize}
          style={{ marginBottom: compact ? theme.spacing.md : theme.spacing.xl }}
        />

        <AppText
          variant="headlineLg"
          align="center"
          accessibilityRole="header"
          style={[styles.headline, { marginBottom: compact ? theme.spacing.sm : theme.spacing.md }]}
        >
          {t('home.headline')}
        </AppText>

        <AppText
          variant={compact ? 'body' : 'bodyLg'}
          color={theme.colors.textMuted}
          align="center"
          style={styles.subline}
        >
          {t('home.subline')}
        </AppText>
      </View>

      <View style={styles.actions}>
        <AppButton
          label={t('home.play')}
          variant="primary"
          icon="play-arrow"
          onPress={() => router.push('/ready')}
        />
        <AppButton
          label={t('home.modes')}
          variant="secondary"
          icon="grid-view"
          onPress={() => router.push('/modes')}
        />
      </View>

      <DailyCard daily={daily} onPress={openDaily} onShare={shareToday} />

      <View style={styles.stats}>
        <StatCard
          icon="emoji-events"
          label={t('home.bestScore')}
          value={String(stats.bestScore)}
          compact={compact}
        />
        <StatCard
          icon="local-fire-department"
          label={t('home.streak')}
          value={currentStreak(stats)}
          compact={compact}
        />
        <StatCard
          icon="replay"
          label={t('home.rounds')}
          value={formatNumber(roundsPlayed(stats))}
          compact={compact}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
  },
  headline: {
    maxWidth: 480,
  },
  subline: {
    maxWidth: 360,
  },
  actions: {
    gap: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
});
