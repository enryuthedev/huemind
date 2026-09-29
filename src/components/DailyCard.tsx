import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/src/theme';
import { AppText } from '@/src/components/AppText';
import {
  DAILY_MAX,
  DAILY_ROUNDS,
  dailyNumber,
  formatCountdown,
  msUntilMidnight,
  sumScores,
  todayKey,
} from '@/src/utils/daily';
import type { DailyState } from '@/src/types';

/** Ticks once per second: "HH:MM:SS" until the next local midnight. */
export function useMidnightCountdown(): string {
  const [ms, setMs] = useState(() => msUntilMidnight());
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);
  return formatCountdown(ms);
}

/** Today's daily progress derived from the persisted daily slice. */
export function todayDaily(daily: DailyState, today: string = todayKey()) {
  const results = daily.date === today ? daily.results : [];
  return {
    date: today,
    results,
    played: results.length,
    completed: daily.date === today && daily.completed,
    total: sumScores(results),
  };
}

interface DailyCardProps {
  daily: DailyState;
  /** Card tap: start / resume the challenge, or open the summary once done. */
  onPress: () => void;
  /** Shown as a trailing share button once today's challenge is completed. */
  onShare: () => void;
}

/**
 * Slim (~72dp) home entry for the Daily Challenge: icon, numbered title,
 * progress subtitle and a chevron — or, once completed, the day's total, a
 * countdown to new colors and a share button.
 */
export function DailyCard({ daily, onPress, onShare }: DailyCardProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  // Re-evaluate "today" every second so the card flips at midnight.
  const countdown = useMidnightCountdown();
  const info = todayDaily(daily);

  let subtitle: string;
  if (info.completed) {
    subtitle = `${t('daily.subtitleDone', { score: info.total, max: DAILY_MAX })} · ${countdown}`;
  } else if (info.played > 0) {
    subtitle = t('daily.subtitlePartial', { played: info.played, total: DAILY_ROUNDS });
  } else {
    subtitle = t('daily.subtitleNew', { total: DAILY_ROUNDS });
  }
  const title = t('daily.titleNumbered', { n: dailyNumber(info.date) });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        theme.shadow,
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: theme.colors.inset, borderRadius: theme.radius.full },
        ]}
      >
        <MaterialIcons
          name={info.completed ? 'check-circle' : 'today'}
          size={22}
          color={theme.colors.text}
        />
      </View>
      <View style={styles.texts}>
        <AppText variant="bodyMedium" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {title}
        </AppText>
        <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {subtitle}
        </AppText>
      </View>
      {info.completed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('daily.share')}
          onPress={onShare}
          hitSlop={8}
          style={({ pressed }) => [
            styles.trailingBtn,
            {
              backgroundColor: theme.colors.inset,
              borderRadius: theme.radius.full,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialIcons name="share" size={20} color={theme.colors.text} />
        </Pressable>
      ) : (
        <MaterialIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  trailingBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
