import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/src/components/AppButton';
import { AppHeader } from '@/src/components/AppHeader';
import { AppText } from '@/src/components/AppText';
import { Celebration } from '@/src/components/Celebration';
import { ColorSwatch } from '@/src/components/ColorSwatch';
import { Pill } from '@/src/components/Pill';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { feedback } from '@/src/services/feedback';
import { useStore } from '@/src/store/useStore';
import { useTheme } from '@/src/theme';
import { colorHint } from '@/src/utils/hint';
import { feedbackKey, type FeedbackTier } from '@/src/utils/scoring';
import { UpsellCard } from '@/src/components/UpsellCard';
import { usePremium } from '@/src/services/purchases';
import { DAILY_ROUNDS } from '@/src/utils/daily';

/** Upsell rules: good round, some experience, and not nagging. */
const UPSELL_MIN_SCORE = 70;
const UPSELL_MIN_ROUNDS = 5;
const UPSELL_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

function shouldShowUpsell(): boolean {
  const s = useStore.getState();
  const r = s.game.lastResult;
  if (!r || s.premium || r.source === 'training') return false;
  if (r.score < UPSELL_MIN_SCORE) return false;
  if (s.stats.history.length < UPSELL_MIN_ROUNDS) return false;
  return s.lastUpsellAt === null || Date.now() - s.lastUpsellAt >= UPSELL_COOLDOWN_MS;
}

/** Number of copy variants per tier: `result.feedback.<tier>_1 .. _N`. */
const FEEDBACK_VARIANTS = 3;
const COUNT_UP_MS = 900;

function tierHaptic(tier: FeedbackTier): void {
  if (tier === 'perfect' || tier === 'almost') feedback.success();
  else if (tier === 'off') feedback.warning();
  else feedback.select();
}

/**
 * Result screen — shows the outcome of the round that was just recorded.
 *
 * Reads `game.lastResult` (incl. the `isNewBest` flag captured at record time).
 * If there is no result we bounce back home. Otherwise: target vs. picked
 * swatches (staggered entrance), a score that counts up, a feedback line, a
 * coaching hint, and next/retry/home actions. Daily and training rounds get
 * flow-specific "next" actions and no retry (no replaying a known color).
 * Non-Pro players may see a dismissible upsell card after a good round. Once the count-up lands we fire
 * the tier haptic and, for great rounds, a celebration burst.
 */
export default function ResultScreen(): React.JSX.Element | null {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();

  const result = useStore((s) => s.game.lastResult);
  const showDetails = useStore((s) => s.settings.showDifficultyDetails);
  const daily = useStore((s) => s.daily);
  const markUpsellShown = useStore((s) => s.markUpsellShown);
  const premium = usePremium();

  // Decided once per screen instance so marking it shown doesn't hide it again.
  const [upsellEligible] = useState(shouldShowUpsell);
  const [upsellDismissed, setUpsellDismissed] = useState(false);
  useEffect(() => {
    if (upsellEligible) markUpsellShown();
  }, [upsellEligible, markUpsellShown]);

  const [displayScore, setDisplayScore] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const countUp = useRef(new Animated.Value(0)).current;
  const targetIn = useRef(new Animated.Value(0)).current;
  const guessIn = useRef(new Animated.Value(0)).current;

  // No result to display → return to the home screen.
  useEffect(() => {
    if (!result) {
      router.dismissTo('/home');
    }
  }, [result, router]);

  const resultId = result?.id;
  const score = result?.score ?? 0;

  // Score count-up (0 → score, ease-out), then tier haptic + celebration.
  useEffect(() => {
    if (!resultId) return;
    setRevealed(false);
    setDisplayScore(0);
    countUp.setValue(0);
    const id = countUp.addListener(({ value }) => setDisplayScore(Math.round(value)));
    const anim = Animated.timing(countUp, {
      toValue: score,
      duration: score > 0 ? COUNT_UP_MS : 1,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (!finished) return;
      setDisplayScore(score);
      setRevealed(true);
      tierHaptic(feedbackKey(score));
    });
    return () => {
      anim.stop();
      countUp.removeListener(id);
    };
  }, [resultId, score, countUp]);

  // Staggered swatch entrance: target first, then the guess slides in.
  useEffect(() => {
    if (!resultId) return;
    targetIn.setValue(0);
    guessIn.setValue(0);
    const anim = Animated.stagger(180, [
      Animated.timing(targetIn, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(guessIn, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [resultId, targetIn, guessIn]);

  // Pick one copy variant per result (stable across re-renders).
  const tier = feedbackKey(score);
  const variant = useMemo(
    () => 1 + Math.floor(Math.random() * FEEDBACK_VARIANTS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resultId],
  );

  const hint = useMemo(
    () => (result ? colorHint(result.target, result.guess, result.score) : null),
    [result],
  );

  if (!result) {
    return null;
  }

  const isNewBest = result.isNewBest;
  const celebrate = revealed && (result.score >= 88 || isNewBest);
  const intensity = result.score >= 97 || isNewBest ? 'full' : 'soft';

  const swatchSize = Math.floor(Math.max(0, Math.min(height < 700 ? 104 : 140, (width - 48 - 24) / 2)));

  const goHome = () => router.dismissTo('/home');

  const source = result.source ?? 'normal';
  const dailyPlayed = daily.results.length;
  const showUpsell = upsellEligible && !upsellDismissed && !premium;

  let primaryAction: { label: string; onPress: () => void };
  if (source === 'daily') {
    primaryAction = daily.completed
      ? {
          label: t('daily.showSummary'),
          onPress: () => router.replace('/daily-summary'),
        }
      : {
          label: t('daily.nextColor', { n: dailyPlayed + 1, total: DAILY_ROUNDS }),
          onPress: () =>
            router.replace({
              pathname: '/game',
              params: { daily: '1', dailyRound: String(dailyPlayed) },
            }),
        };
  } else if (source === 'training') {
    primaryAction = {
      label: t('training.next'),
      onPress: () => router.replace({ pathname: '/game', params: { training: '1' } }),
    };
  } else {
    primaryAction = {
      label: t('result.nextRound'),
      onPress: () => router.replace('/game'),
    };
  }

  return (
    <ScreenContainer>
      <AppHeader showBack onBack={goHome} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >

      <Celebration active={celebrate} intensity={intensity} color={result.guess} />

      {source === 'daily' ? (
        <View style={styles.newBest}>
          <Pill
            label={t('daily.progress', {
              current: Math.min(dailyPlayed, DAILY_ROUNDS),
              total: DAILY_ROUNDS,
            })}
          />
        </View>
      ) : null}

      {isNewBest ? (
        <View style={styles.newBest}>
          <Pill label={t('result.newBest')} tone="accent" accent={result.guess} />
        </View>
      ) : null}

      <View style={styles.swatches}>
        <Animated.View
          style={{
            opacity: targetIn,
            transform: [
              { scale: targetIn.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            ],
          }}
        >
          <ColorSwatch color={result.target} size={swatchSize} label={t('result.original')} glow />
        </Animated.View>
        <Animated.View
          style={{
            opacity: guessIn,
            transform: [
              { translateX: guessIn.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) },
            ],
          }}
        >
          <ColorSwatch color={result.guess} size={swatchSize} label={t('result.yourPick')} glow />
        </Animated.View>
      </View>

      <View style={styles.scoreBlock}>
        <View style={styles.scoreRow}>
          <AppText variant="display">{displayScore}</AppText>
          <AppText variant="headlineMd" color={theme.colors.textMuted} style={styles.scoreMax}>
            {' / 100'}
          </AppText>
        </View>

        <AppText variant="headlineMd" align="center" style={styles.feedback}>
          {t(`result.feedback.${tier}_${variant}`)}
        </AppText>
      </View>

      <View style={styles.pills}>
        {hint ? <Pill label={t(hint.i18nKey)} /> : null}
        <Pill label={`${t('result.reaction')}: ${(result.reactionMs / 1000).toFixed(1)}s`} />
        {showDetails ? (
          <>
            <Pill label={`ΔE: ${result.deltaE}`} />
            <Pill label={result.target.toUpperCase()} tone="accent" accent={result.target} />
            <Pill label={result.guess.toUpperCase()} tone="accent" accent={result.guess} />
          </>
        ) : null}
      </View>

      {showUpsell ? (
        <View style={styles.upsell}>
          <UpsellCard
            onPress={() =>
              router.push({ pathname: '/paywall', params: { source: 'upsell' } })
            }
            onDismiss={() => setUpsellDismissed(true)}
          />
        </View>
      ) : null}

      </ScrollView>

      {/* Pinned footer so the main action is always reachable. */}
      <View style={styles.actions}>
        {source === 'normal' ? (
          <View style={styles.retry}>
            <AppButton
              label=""
              variant="secondary"
              icon="replay"
              accessibilityLabel={t('result.retry')}
              onPress={() =>
                router.replace({ pathname: '/game', params: { retry: result.target } })
              }
            />
          </View>
        ) : null}
        <View style={styles.primary}>
          <AppButton
            label={primaryAction.label}
            icon="arrow-forward"
            iconPosition="right"
            onPress={primaryAction.onPress}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  newBest: {
    alignItems: 'center',
    marginTop: 8,
  },
  swatches: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 24,
    marginTop: 24,
  },
  scoreBlock: {
    alignItems: 'center',
    marginTop: 32,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreMax: {
    marginLeft: 4,
  },
  feedback: {
    marginTop: 8,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  upsell: {
    marginTop: 24,
  },
  flex: {
    flex: 1,
  },
  scrollBody: {
    paddingBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  retry: {
    width: 64,
  },
  primary: {
    flex: 1,
  },
});
