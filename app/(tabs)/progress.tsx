import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { AppHeader } from '@/src/components/AppHeader';
import { AppText } from '@/src/components/AppText';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { WeeklyChart } from '@/src/components/WeeklyChart';
import { AppButton } from '@/src/components/AppButton';
import { ColorSwatch } from '@/src/components/ColorSwatch';
import { Pill } from '@/src/components/Pill';
import { ProLock } from '@/src/components/ProLock';
import { StatCard } from '@/src/components/StatCard';
import { MODE_ORDER } from '@/src/constants/modes';
import { usePremium } from '@/src/services/purchases';
import {
  MIN_ANALYSIS_ROUNDS,
  computeAnalysis,
  hasEnoughForAnalysis,
  weakestFamilies,
} from '@/src/store/analysis';
import { useStore } from '@/src/store/useStore';
import {
  averageScore,
  bestColorKey,
  currentStreak,
  hardestColorKey,
  roundsPlayed,
  trendDelta,
  weeklyScoresNullable,
} from '@/src/store/selectors';
import { useTheme, type Theme } from '@/src/theme';
import type { Stats } from '@/src/types';
import type { ColorNameKey } from '@/src/utils/colorName';

/**
 * Representative hex per coarse color bucket, used purely for the decorative
 * swatches in the "best / hardest color" tiles. Kept local — the buckets come
 * from `colorNameKey`, the names from i18n `colors.*`.
 */
const COLOR_HEX: Record<ColorNameKey, string> = {
  red: '#E2574A',
  orange: '#E8893B',
  yellow: '#E8C547',
  lime: '#A4C639',
  green: '#5BA85B',
  teal: '#38B2AC',
  cyan: '#3BC9D9',
  blue: '#4A90E2',
  indigo: '#5C6BC0',
  purple: '#9B59B6',
  magenta: '#C2479B',
  pink: '#E27AA8',
  brown: '#9C6B4A',
  grey: '#9A9694',
  white: '#F2F0EE',
  black: '#2B2A28',
};

type Styles = ReturnType<typeof makeStyles>;

/**
 * Progress / insights screen: a weekly score sparkline plus a bento grid of
 * aggregate stats (average + trend, best score, rounds, best & hardest color).
 * Falls back to a friendly empty state before the first round is played.
 */
export default function ProgressScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const stats = useStore((s) => s.stats);

  const rounds = roundsPlayed(stats);
  const styles = makeStyles(theme);

  return (
    <ScreenContainer scroll edges={['top']}>
      <AppHeader />

      <View style={styles.heading}>
        <AppText variant="headlineLg" accessibilityRole="header">
          {t('progress.title')}
        </AppText>
        <AppText variant="body" color={theme.colors.textMuted} style={styles.subtitle}>
          {t('progress.subtitle')}
        </AppText>
      </View>

      {rounds === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <MaterialIcons name="insights" size={32} color={theme.colors.textMuted} />
          </View>
          <AppText variant="bodyLg" color={theme.colors.textMuted} align="center">
            {t('progress.empty')}
          </AppText>
        </View>
      ) : (
        <ProgressContent stats={stats} rounds={rounds} theme={theme} styles={styles} />
      )}
    </ScreenContainer>
  );
}

/** Inner content shown once at least one round exists. */
function ProgressContent({
  stats,
  rounds,
  theme,
  styles,
}: {
  stats: Stats;
  rounds: number;
  theme: Theme;
  styles: Styles;
}) {
  const { t } = useTranslation();
  const now = Date.now();
  // Future days come back as null and are skipped by the chart.
  const { values, labels } = weeklyScoresNullable(stats, now);
  const dayLabels = labels.map((key) => t(`days.${key}`));
  // Monday-first index of today; later days are in the future and not plotted.
  const todayIndex = (new Date(now).getDay() + 6) % 7;

  const avg = averageScore(stats);
  const trend = trendDelta(stats);
  const streak = currentStreak(stats, now);

  const bestKey = bestColorKey(stats);
  const hardestKey = hardestColorKey(stats);

  return (
    <>
      {/* Weekly streak hero card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label" color={theme.colors.textMuted} style={styles.shrink}>
            {t('progress.weeklyStreak').toUpperCase()}
          </AppText>
          <View style={styles.streakRow}>
            <MaterialIcons
              name="local-fire-department"
              size={16}
              color={theme.colors.textMuted}
            />
            <AppText variant="caption" color={theme.colors.text}>
              {t('progress.currentStreak', { count: streak })}
            </AppText>
          </View>
        </View>

        <WeeklyChart values={values} labels={dayLabels} todayIndex={todayIndex} />
      </View>

      {/* Bento grid of aggregate stats */}
      <View style={styles.grid}>
        <StatTile
          label={t('progress.avgScore')}
          value={avg}
          suffix="%"
          trend={trend}
          theme={theme}
          styles={styles}
        />
        <StatTile
          label={t('progress.bestScore')}
          value={stats.bestScore}
          suffix="%"
          theme={theme}
          styles={styles}
        />
        <StatTile
          label={t('progress.roundsPlayed')}
          value={rounds}
          theme={theme}
          styles={styles}
        />
        <ColorTile
          label={t('progress.bestColor')}
          colorKey={bestKey}
          theme={theme}
          styles={styles}
        />
        <ColorTile
          label={t('progress.hardestColor')}
          colorKey={hardestKey}
          wide
          theme={theme}
          styles={styles}
        />
      </View>

      <AnalysisSection stats={stats} rounds={rounds} theme={theme} styles={styles} />
    </>
  );
}

/**
 * "Farb-Analyse" (HueMind Pro): per-family averages, best per mode, the last
 * rounds as target/guess pairs, plus the "Schwächen trainieren" entry point.
 * Free users see a dimmed placeholder behind a ProLock overlay.
 */
function AnalysisSection({
  stats,
  rounds,
  theme,
  styles,
}: {
  stats: Stats;
  rounds: number;
  theme: Theme;
  styles: Styles;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const premium = usePremium();
  const enough = hasEnoughForAnalysis(stats);

  const openPaywall = (source: 'analysis' | 'training'): void => {
    router.push({ pathname: '/paywall', params: { source } });
  };

  const startTraining = (): void => {
    if (!premium) {
      openPaywall('training');
      return;
    }
    router.push({ pathname: '/game', params: { training: '1' } });
  };

  const weakest = premium ? weakestFamilies(stats) : [];
  const trainingDesc =
    weakest.length > 0
      ? t('progress.trainDescColors', {
          colors: weakest.map((k) => t(`colors.${k}`)).join(', '),
        })
      : t('progress.trainDesc');

  let body: React.ReactNode;
  if (!premium) {
    body = (
      <ProLock
        title={t('pro.unlock')}
        description={t('pro.analysisDesc')}
        ctaLabel={t('pro.cta')}
        onPress={() => openPaywall('analysis')}
        style={styles.card}
      >
        <AnalysisPlaceholder theme={theme} styles={styles} />
      </ProLock>
    );
  } else if (!enough) {
    body = (
      <View style={[styles.card, styles.analysisEmpty]}>
        <MaterialIcons name="query-stats" size={28} color={theme.colors.textMuted} />
        <AppText variant="body" color={theme.colors.textMuted} align="center">
          {t('progress.analysisEmpty', {
            min: MIN_ANALYSIS_ROUNDS,
            count: MIN_ANALYSIS_ROUNDS - rounds,
          })}
        </AppText>
      </View>
    );
  } else {
    body = <AnalysisContent stats={stats} theme={theme} styles={styles} />;
  }

  return (
    <View style={styles.analysisSection}>
      <View style={styles.sectionHeader}>
        <AppText variant="headlineMd" accessibilityRole="header" style={styles.shrink}>
          {t('progress.analysisTitle')}
        </AppText>
        <Pill label={t('pro.badge')} />
      </View>

      {body}

      {/* Weakness training (Pro). Free users always see the teaser. */}
      {!premium || enough ? (
        <View style={styles.card}>
          <View style={styles.trainHeader}>
            <MaterialIcons name="fitness-center" size={20} color={theme.colors.text} />
            <AppText variant="bodyMedium" style={styles.shrink}>
              {t('progress.trainTitle')}
            </AppText>
            {!premium ? (
              <MaterialIcons name="lock" size={16} color={theme.colors.textMuted} />
            ) : null}
          </View>
          <AppText
            variant="caption"
            color={theme.colors.textMuted}
            style={{ marginTop: theme.spacing.xs, marginBottom: theme.spacing.md }}
          >
            {trainingDesc}
          </AppText>
          <AppButton
            label={premium ? t('progress.trainCta') : t('pro.unlock')}
            icon={premium ? 'play-arrow' : 'lock'}
            variant={premium ? 'primary' : 'secondary'}
            onPress={startTraining}
          />
        </View>
      ) : null}
    </View>
  );
}

/** Real analysis content (premium, ≥ MIN_ANALYSIS_ROUNDS rounds). */
function AnalysisContent({
  stats,
  theme,
  styles,
}: {
  stats: Stats;
  theme: Theme;
  styles: Styles;
}) {
  const { t } = useTranslation();
  const { families, bestPerMode, recent } = computeAnalysis(stats);

  return (
    <>
      {/* Per color family averages, weakest first */}
      <View style={styles.card}>
        <AppText variant="label" color={theme.colors.textMuted}>
          {t('progress.familiesTitle').toUpperCase()}
        </AppText>
        <AppText
          variant="caption"
          color={theme.colors.textFaint}
          style={{ marginTop: 2, marginBottom: theme.spacing.md }}
        >
          {t('progress.familiesHint')}
        </AppText>
        {families.slice(0, 8).map((f) => (
          <FamilyBar
            key={f.key}
            name={t(`colors.${f.key}`)}
            hex={COLOR_HEX[f.key]}
            value={f.avg}
            count={f.count}
            theme={theme}
            styles={styles}
          />
        ))}
      </View>

      {/* Best score per mode */}
      <View style={styles.card}>
        <AppText
          variant="label"
          color={theme.colors.textMuted}
          style={{ marginBottom: theme.spacing.md }}
        >
          {t('progress.bestPerMode').toUpperCase()}
        </AppText>
        <View style={styles.modeGrid}>
          {MODE_ORDER.map((id) => {
            const best = bestPerMode[id];
            return (
              <StatCard
                key={id}
                compact
                label={t(`modes.${id}.short`)}
                value={best === null ? t('progress.none') : `${best}%`}
                style={[styles.modeCell, { backgroundColor: theme.colors.cardAlt }]}
              />
            );
          })}
        </View>
      </View>

      {/* Last rounds: target vs. guess */}
      <View style={styles.card}>
        <AppText variant="label" color={theme.colors.textMuted}>
          {t('progress.recentTitle', { count: recent.length }).toUpperCase()}
        </AppText>
        <AppText
          variant="caption"
          color={theme.colors.textFaint}
          style={{ marginTop: 2, marginBottom: theme.spacing.xs }}
        >
          {`${t('progress.target')} → ${t('progress.guess')}`}
        </AppText>
        {recent.map((r, i) => (
          <View
            key={r.id}
            accessible
            accessibilityLabel={`${t(`modes.${r.mode}.short`)}, ${r.score}%`}
            style={[
              styles.recentRow,
              i < recent.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.pair}>
              <ColorSwatch color={r.target} size={30} radius={8} />
              <MaterialIcons name="arrow-forward" size={14} color={theme.colors.textFaint} />
              <ColorSwatch color={r.guess} size={30} radius={8} />
            </View>
            <AppText
              variant="caption"
              color={theme.colors.textMuted}
              numberOfLines={1}
              style={styles.recentMode}
            >
              {t(`modes.${r.mode}.short`)}
            </AppText>
            <AppText variant="bodyMedium" style={styles.recentScore}>
              {`${r.score}%`}
            </AppText>
          </View>
        ))}
      </View>
    </>
  );
}

/** One horizontal bar: color dot, family name, fill bar, average %. */
function FamilyBar({
  name,
  hex,
  value,
  count,
  theme,
  styles,
}: {
  name: string;
  hex: string;
  value: number;
  count?: number;
  theme: Theme;
  styles: Styles;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View
      style={styles.barRow}
      accessible
      accessibilityLabel={`${name}: ${value}%${count ? ` (${count})` : ''}`}
    >
      <View style={[styles.barDot, { backgroundColor: hex, borderColor: theme.colors.border }]} />
      <AppText variant="caption" numberOfLines={1} style={styles.barName}>
        {name}
      </AppText>
      <View style={[styles.barTrack, { backgroundColor: theme.colors.inset }]}>
        <View
          style={[styles.barFill, { width: `${pct}%`, backgroundColor: theme.colors.text }]}
        />
      </View>
      <AppText variant="caption" color={theme.colors.textMuted} style={styles.barValue}>
        {`${value}%`}
      </AppText>
    </View>
  );
}

/** Static fake content shown (dimmed) behind the ProLock for free users. */
const FAKE_BARS: ReadonlyArray<{ key: ColorNameKey; value: number }> = [
  { key: 'teal', value: 58 },
  { key: 'purple', value: 66 },
  { key: 'orange', value: 74 },
  { key: 'blue', value: 81 },
  { key: 'green', value: 88 },
];

function AnalysisPlaceholder({ theme, styles }: { theme: Theme; styles: Styles }) {
  return (
    <View>
      <View
        style={[
          styles.fakeLabel,
          { backgroundColor: theme.colors.inset, marginBottom: theme.spacing.md },
        ]}
      />
      {FAKE_BARS.map((b) => (
        <FamilyBar
          key={b.key}
          name="• • • • •"
          hex={COLOR_HEX[b.key]}
          value={b.value}
          theme={theme}
          styles={styles}
        />
      ))}
      <View style={[styles.pair, { marginTop: theme.spacing.md }]}>
        <ColorSwatch color={COLOR_HEX.pink} size={30} radius={8} />
        <MaterialIcons name="arrow-forward" size={14} color={theme.colors.textFaint} />
        <ColorSwatch color={COLOR_HEX.magenta} size={30} radius={8} />
      </View>
    </View>
  );
}

/** A square bento tile showing a big numeric value with an optional trend. */
function StatTile({
  label,
  value,
  suffix,
  trend,
  style,
  theme,
  styles,
}: {
  label: string;
  value: number;
  suffix?: string;
  trend?: number;
  style?: StyleProp<ViewStyle>;
  theme: Theme;
  styles: Styles;
}) {
  const hasTrend = trend !== undefined && trend !== 0;

  return (
    <View style={[styles.card, styles.tile, style]}>
      <AppText variant="label" color={theme.colors.textMuted} numberOfLines={2}>
        {label.toUpperCase()}
      </AppText>

      <View>
        <View style={styles.valueRow}>
          <AppText
            variant="display"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            style={styles.shrink}
          >
            {value.toLocaleString()}
          </AppText>
          {suffix ? (
            <AppText
              variant="headlineMd"
              color={theme.colors.textMuted}
              style={styles.valueSuffix}
            >
              {suffix}
            </AppText>
          ) : null}
        </View>

        {hasTrend ? (
          <View style={styles.trendRow}>
            <MaterialIcons
              name={trend > 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={theme.colors.textMuted}
            />
            <AppText variant="label" color={theme.colors.textMuted}>
              {`${trend > 0 ? '+' : ''}${trend}%`}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** A tile pairing a label with a representative color swatch + name. */
function ColorTile({
  label,
  colorKey,
  wide = false,
  theme,
  styles,
}: {
  label: string;
  colorKey: string | null;
  wide?: boolean;
  theme: Theme;
  styles: Styles;
}) {
  const { t } = useTranslation();
  const hex = colorKey ? COLOR_HEX[colorKey as ColorNameKey] : theme.colors.inset;
  const name = colorKey ? t(`colors.${colorKey}`) : t('progress.none');

  return (
    <View style={[styles.card, styles.tile, wide && styles.tileWide]}>
      <AppText variant="label" color={theme.colors.textMuted} numberOfLines={2}>
        {label.toUpperCase()}
      </AppText>

      <View style={styles.colorRow}>
        <View
          style={[
            styles.colorDot,
            { backgroundColor: hex, borderColor: theme.colors.border },
          ]}
        />
        <AppText variant="bodyLg" numberOfLines={2} style={styles.shrink}>
          {name}
        </AppText>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, radius, spacing } = theme;

  const card: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...theme.shadow,
  };

  return StyleSheet.create({
    heading: {
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    subtitle: {
      marginTop: spacing.xs,
    },
    empty: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.huge,
      gap: spacing.lg,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: radius.full,
      backgroundColor: colors.inset,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      ...card,
      marginBottom: spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      columnGap: spacing.sm,
      rowGap: spacing.xs,
      marginBottom: spacing.lg,
    },
    shrink: {
      flexShrink: 1,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    tile: {
      width: '48%',
      minHeight: 132,
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    tileWide: {
      width: '100%',
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    valueSuffix: {
      marginLeft: spacing.xs,
      marginBottom: 6,
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    colorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    analysisSection: {
      marginTop: spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    analysisEmpty: {
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xl,
    },
    trainHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    barDot: {
      width: 14,
      height: 14,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
    },
    barName: {
      width: 76,
    },
    barTrack: {
      flex: 1,
      height: 8,
      borderRadius: radius.full,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: radius.full,
    },
    barValue: {
      width: 38,
      textAlign: 'right',
    },
    fakeLabel: {
      width: '40%',
      height: 10,
      borderRadius: radius.full,
    },
    modeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: spacing.sm,
    },
    modeCell: {
      flex: 0,
      width: '48.5%',
      shadowOpacity: 0,
      elevation: 0,
    },
    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    pair: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    recentMode: {
      flex: 1,
    },
    recentScore: {
      minWidth: 44,
      textAlign: 'right',
    },
    colorDot: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
    },
  });
}
