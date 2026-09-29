import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Animated,
  AppState,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme } from '@/src/theme';
import { useStore } from '@/src/store/useStore';
import {
  HARDCORE_DISTRACTORS,
  HARDCORE_DISTRACTOR_MS,
  MODES,
  playableMode,
} from '@/src/constants/modes';
import {
  hexToHsv,
  hsvToHex,
  randomDistractorHex,
  randomTargetHex,
} from '@/src/utils/color';
import { computeRound } from '@/src/utils/scoring';
import { DAILY_MODE, DAILY_ROUNDS, dailyTargets, todayKey } from '@/src/utils/daily';
import { trainingTarget } from '@/src/store/selectors';
import { usePremium } from '@/src/services/purchases';
import type { HSV, RoundSource } from '@/src/types';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { AppText } from '@/src/components/AppText';
import { AppButton } from '@/src/components/AppButton';
import { ColorSwatch } from '@/src/components/ColorSwatch';
import { CountdownRing } from '@/src/components/CountdownRing';
import { ColorPicker } from '@/src/components/ColorPicker';

type Phase = 'distract' | 'target' | 'memorize' | 'transition' | 'pick';

/** Length of the neutral pause between memorizing and picking (ms). */
const TRANSITION_MS = 700;

const HEX_RE = /^#?[0-9A-Fa-f]{6}$/;

/** Normalises a `retry` route param to `#RRGGBB`, or null if invalid. */
function parseRetryHex(param: string | string[] | undefined): string | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (!raw || !HEX_RE.test(raw)) {
    return null;
  }
  return `#${raw.replace('#', '').toUpperCase()}`;
}

interface RoundSetup {
  source: RoundSource;
  target: string;
  /** Daily flow: the day key and 0-based round index the target belongs to. */
  dailyDate?: string;
  dailyIndex?: number;
  /** Training flow: the targeted color family (null = random fallback). */
  family?: string | null;
  /** Set when this round must not be played (redirect instead). */
  blocked?: 'paywall' | 'dailyDone';
}

/**
 * Resolves the round's flow and target once on mount. Daily progress is read
 * from the store (not the route param) so finished rounds can't be replayed.
 */
function setupRound(flags: {
  daily: boolean;
  training: boolean;
  retry: string | string[] | undefined;
}): RoundSetup {
  const state = useStore.getState();
  if (flags.daily) {
    const date = todayKey();
    const played = state.daily.date === date ? state.daily.results.length : 0;
    if (played >= DAILY_ROUNDS) {
      return { source: 'daily', target: '#808080', blocked: 'dailyDone' };
    }
    return {
      source: 'daily',
      target: dailyTargets(date)[played],
      dailyDate: date,
      dailyIndex: played,
    };
  }
  if (flags.training) {
    if (!state.premium) {
      return { source: 'training', target: '#808080', blocked: 'paywall' };
    }
    const { hex, family } = trainingTarget(state.stats);
    return { source: 'training', target: hex, family };
  }
  return { source: 'normal', target: parseRetryHex(flags.retry) ?? randomTargetHex() };
}

/** Random picker start hue at least 60° away from the target hue. */
function startHue(targetHex: string): number {
  const th = hexToHsv(targetHex).h;
  return (th + 60 + Math.random() * 240) % 360;
}

/**
 * The core gameplay screen — a small state machine that walks the player through
 * memorizing a target color and then reproducing it with the color picker.
 *
 * Phases:
 *  - `distract`   (hardcore only) flashes random distractor colors
 *  - `target`     (hardcore only) reveals the real target under a countdown
 *  - `memorize`   (non-hardcore) shows the target under a countdown, pausable
 *  - `transition` a neutral beat that hides the target before picking
 *  - `pick`       the color picker; confirming scores the round
 *
 * Every timer is created inside a phase-scoped effect and torn down on phase
 * change / unmount, and all timer callbacks read the latest values through refs
 * or functional updates so there are no stale-closure bugs.
 *
 * A `retry` route param (`#RRGGBB`) replays that exact target instead of a
 * random one. `daily=1` plays the next Daily Challenge color (Normal timing;
 * `dailyRound` is informational — progress comes from the store). `training=1`
 * plays Schwächen-Training (Pro only; otherwise redirects to the paywall).
 */
export default function GameScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{
    retry?: string;
    daily?: string;
    dailyRound?: string;
    training?: string;
  }>();
  const premium = usePremium();

  const [setup] = useState<RoundSetup>(() =>
    setupRound({
      daily: params.daily === '1',
      training: params.daily !== '1' && params.training === '1',
      retry: params.retry,
    }),
  );
  const blocked = setup.blocked ?? (setup.source === 'training' && !premium ? 'paywall' : undefined);

  useEffect(() => {
    if (blocked === 'paywall') {
      router.replace({ pathname: '/paywall', params: { source: 'training' } });
    } else if (blocked === 'dailyDone') {
      router.replace('/daily-summary');
    }
  }, [blocked, router]);

  const selectedMode = useStore((s) => s.game.selectedMode);
  // Safety net: a Pro-locked mode (hard/hardcore) is never playable without Pro.
  const mode = setup.source === 'daily' ? DAILY_MODE : playableMode(selectedMode, premium);
  const setTarget = useStore((s) => s.setTarget);
  const recordResult = useStore((s) => s.recordResult);
  const showDetails = useStore((s) => s.settings.showDifficultyDetails);

  const config = MODES[mode];

  // Target colour for this round — generated once and mirrored into the store.
  const target = setup.target;
  useEffect(() => {
    if (!setup.blocked) {
      setTarget(target);
    }
  }, [target, setTarget, setup.blocked]);

  let flowLabel: string | null = null;
  if (setup.source === 'daily' && setup.dailyIndex !== undefined) {
    flowLabel = t('daily.progress', { current: setup.dailyIndex + 1, total: DAILY_ROUNDS });
  } else if (setup.source === 'training') {
    flowLabel = setup.family
      ? t('training.labelFamily', { color: t(`colors.${setup.family}`) })
      : t('training.title');
  }

  const [phase, setPhase] = useState<Phase>(() =>
    config.hardcore ? 'distract' : 'memorize',
  );
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [paused, setPaused] = useState(false);
  const [distractColor, setDistractColor] = useState(() => randomDistractorHex());

  // Picker state — start hue kept well away from the target.
  const [hsv, setHsv] = useState<HSV>(() => ({
    h: startHue(target),
    s: 0.5,
    v: 0.6,
  }));
  const [revealHex, setRevealHex] = useState(false);
  const [dragging, setDragging] = useState(false);

  const pickStartRef = useRef(0);
  const submittedRef = useRef(false);
  const quittingRef = useRef(false);

  // Cross-phase content fade.
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0);
    const anim = Animated.timing(fade, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [phase, fade]);

  // Hardcore distractor flashes → reveal the real target.
  useEffect(() => {
    if (phase !== 'distract') {
      return;
    }
    const colors = Array.from({ length: HARDCORE_DISTRACTORS }, () =>
      randomDistractorHex(),
    );
    let index = 0;
    setDistractColor(colors[0]);
    const id = setInterval(() => {
      index += 1;
      if (index >= colors.length) {
        clearInterval(id);
        setPhase('target');
      } else {
        setDistractColor(colors[index]);
      }
    }, HARDCORE_DISTRACTOR_MS);
    return () => clearInterval(id);
  }, [phase]);

  // Neutral transition beat → picking.
  useEffect(() => {
    if (phase !== 'transition') {
      return;
    }
    const id = setTimeout(() => setPhase('pick'), TRANSITION_MS);
    return () => clearTimeout(id);
  }, [phase]);

  // Start the reaction timer the moment the picker appears.
  useEffect(() => {
    if (phase === 'pick') {
      pickStartRef.current = Date.now();
    }
  }, [phase]);

  // App backgrounded: pause memorizing, and don't count background time
  // towards the reaction time while picking.
  useEffect(() => {
    let backgroundedAt: number | null = null;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (backgroundedAt !== null && phaseRef.current === 'pick') {
          pickStartRef.current += Date.now() - backgroundedAt;
        }
        backgroundedAt = null;
      } else if (backgroundedAt === null) {
        backgroundedAt = Date.now();
        if (phaseRef.current === 'memorize') {
          setPaused(true);
        }
      }
    });
    return () => sub.remove();
  }, []);

  function goTransition() {
    const current = phaseRef.current;
    if (current === 'memorize' || current === 'target') {
      setPaused(false);
      setPhase('transition');
    }
  }

  const confirmQuit = useCallback(() => {
    Alert.alert(t('game.quitConfirmTitle'), t('game.quitConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('game.quit'),
        style: 'destructive',
        onPress: () => {
          if (quittingRef.current) {
            return;
          }
          quittingRef.current = true;
          router.dismissTo('/home');
        },
      },
    ]);
  }, [router, t]);

  // Android hardware back → same quit confirmation (swipe-back is disabled on
  // the route itself).
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!submittedRef.current && !quittingRef.current) {
          confirmQuit();
        }
        return true;
      });
      return () => sub.remove();
    }, [confirmQuit]),
  );

  function handleConfirm() {
    if (submittedRef.current) {
      return;
    }
    submittedRef.current = true;

    const now = Date.now();
    const guess = hsvToHex(hsv);
    const result = computeRound({
      mode,
      target,
      guess,
      reactionMs: now - pickStartRef.current,
      timestamp: now,
    });
    recordResult({ ...result, source: setup.source }, { dailyDate: setup.dailyDate });

    router.replace('/result');
  }

  const compact = height < 700;

  if (blocked) {
    return null;
  }

  const flowNode = flowLabel ? (
    <AppText
      variant="label"
      color={theme.colors.textMuted}
      align="center"
      numberOfLines={1}
      style={styles.flowLabel}
    >
      {flowLabel.toUpperCase()}
    </AppText>
  ) : null;
  const swatchSize = Math.round(
    Math.max(120, Math.min(width - 72, height * 0.3, width >= 600 ? 380 : 260)),
  );
  const ringSize = compact ? 96 : 120;
  const stageGap = compact ? 16 : 28;

  // -------------------------------------------------------------------------
  // Pick phase — its own scrollable layout (scroll locked while dragging).
  // -------------------------------------------------------------------------
  if (phase === 'pick') {
    return (
      <ScreenContainer padded={false}>
        <ScrollView
          scrollEnabled={!dragging}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.pickScroll,
            { paddingHorizontal: theme.spacing.containerPadding },
          ]}
        >
          <Animated.View style={[styles.grow, { opacity: fade }]}>
            <View style={styles.topBar}>
              <View style={styles.iconSlot} />
              {flowNode}
              <RoundIconButton
                icon="close"
                onPress={confirmQuit}
                label={t('common.close')}
              />
            </View>

            <AppText variant={compact ? 'headlineMd' : 'headlineLg'}>
              {t('game.pickTitle')}
            </AppText>
            {compact ? null : (
              <AppText
                variant="bodyLg"
                color={theme.colors.textMuted}
                style={styles.pickSub}
              >
                {t('game.pickSub')}
              </AppText>
            )}

            <View style={{ marginTop: compact ? 12 : 24 }}>
              <ColorPicker
                value={hsv}
                onChange={setHsv}
                onDragStart={() => setDragging(true)}
                onDragEnd={() => setDragging(false)}
              />
            </View>

            {showDetails ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setRevealHex((v) => !v)}
                hitSlop={4}
                style={styles.detailsToggle}
              >
                <AppText variant="label" color={theme.colors.textMuted}>
                  {revealHex
                    ? `${t('game.details')} · ${hsvToHex(hsv)}`
                    : t('game.details')}
                </AppText>
              </Pressable>
            ) : null}

          </Animated.View>
        </ScrollView>

        {/* Pinned footer: live preview + confirm, always reachable. */}
        <View
          style={[
            styles.pickFooter,
            { paddingHorizontal: theme.spacing.containerPadding },
          ]}
        >
          <ColorSwatch
            color={hsvToHex(hsv)}
            size={56}
            radius={theme.radius.full}
            glow
          />
          <View style={styles.pickFooterBtn}>
            <AppButton
              label={t('game.confirm')}
              onPress={handleConfirm}
              icon="check"
              iconPosition="right"
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // -------------------------------------------------------------------------
  // Stage phases — distract / target / memorize / transition.
  // -------------------------------------------------------------------------
  let topLeft: ReactNode = null;
  let topRight: ReactNode = null;
  let body: ReactNode = null;

  const closeButton = (
    <RoundIconButton
      icon="close"
      onPress={confirmQuit}
      label={t('common.close')}
    />
  );

  if (phase === 'distract') {
    topRight = closeButton;
    body = (
      <>
        <ColorSwatch
          color={distractColor}
          size={swatchSize}
          radius={theme.radius.xl}
          glow
        />
        <View style={styles.stageTexts}>
          <AppText variant="headlineLg" align="center">
            {t('game.distractTitle')}
          </AppText>
          <AppText
            variant="bodyLg"
            color={theme.colors.textMuted}
            align="center"
          >
            {t('game.distractSub')}
          </AppText>
        </View>
      </>
    );
  } else if (phase === 'target') {
    topRight = closeButton;
    body = (
      <>
        <CountdownRing
          seconds={config.memorizeSeconds}
          size={ringSize}
          running
          onComplete={goTransition}
          color={config.accent}
        />
        <ColorSwatch
          color={target}
          size={swatchSize}
          radius={theme.radius.xl}
          glow
        />
        <View style={styles.stageTexts}>
          <AppText variant="headlineLg" align="center">
            {t('game.targetTitle')}
          </AppText>
          <AppText
            variant="bodyLg"
            color={theme.colors.textMuted}
            align="center"
          >
            {t('game.targetSub')}
          </AppText>
        </View>
      </>
    );
  } else if (phase === 'memorize') {
    topLeft = (
      <RoundIconButton
        icon="pause"
        onPress={() => setPaused(true)}
        label={t('game.pause')}
      />
    );
    body = (
      <>
        <CountdownRing
          seconds={config.memorizeSeconds}
          size={ringSize}
          running={!paused}
          onComplete={goTransition}
          color={config.accent}
        />
        {paused ? (
          // Never show the target while paused — keep the layout stable.
          <View
            style={{
              width: swatchSize,
              height: swatchSize,
              borderRadius: theme.radius.xl,
              backgroundColor: theme.colors.inset,
            }}
          />
        ) : (
          <ColorSwatch
            color={target}
            size={swatchSize}
            radius={theme.radius.xl}
            glow
          />
        )}
        <View style={styles.stageTexts}>
          <AppText variant="headlineLg" align="center">
            {t('game.memorizeTitle')}
          </AppText>
          {compact ? null : (
            <AppText
              variant="bodyLg"
              color={theme.colors.textMuted}
              align="center"
            >
              {t('game.memorizeSub')}
            </AppText>
          )}
        </View>
        <AppButton
          label={t('game.gotIt')}
          onPress={goTransition}
          variant="secondary"
          icon="check"
          iconPosition="right"
          full={false}
        />
      </>
    );
  } else {
    // transition
    body = (
      <View style={styles.stageTexts}>
        <AppText variant="headlineLg" align="center">
          {t('game.transitionTitle')}
        </AppText>
        <AppText variant="bodyLg" color={theme.colors.textMuted} align="center">
          {t('game.transitionSub')}
        </AppText>
      </View>
    );
  }

  return (
    <ScreenContainer>
      <Animated.View style={[styles.grow, { opacity: fade }]}>
        <View style={styles.topBar}>
          <View style={styles.iconSlot}>{topLeft}</View>
          {flowNode}
          <View style={styles.iconSlot}>{topRight}</View>
        </View>
        <View style={[styles.stageCenter, { gap: stageGap }]}>{body}</View>
      </Animated.View>

      {paused && phase === 'memorize' ? (
        <View
          style={[styles.pausedOverlay, { backgroundColor: theme.colors.overlay }]}
        >
          <View
            style={[
              styles.pausedCard,
              theme.shadow,
              {
                backgroundColor: theme.colors.card,
                borderRadius: theme.radius.xl,
                padding: theme.spacing.xl,
              },
            ]}
          >
            <AppText variant="headlineMd" align="center">
              {t('game.paused')}
            </AppText>
            <View style={styles.pausedButtons}>
              <AppButton
                label={t('game.resume')}
                onPress={() => setPaused(false)}
                icon="play-arrow"
              />
              <AppButton
                label={t('game.quit')}
                onPress={confirmQuit}
                variant="ghost"
              />
            </View>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function RoundIconButton({
  icon,
  onPress,
  label,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  label: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          backgroundColor: theme.colors.inset,
          borderRadius: theme.radius.full,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <MaterialIcons name={icon} size={22} color={theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grow: {
    flexGrow: 1,
  },
  pickScroll: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  flowLabel: {
    flex: 1,
    marginHorizontal: 8,
  },
  iconSlot: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTexts: {
    gap: 8,
    alignItems: 'center',
  },
  pickSub: {
    marginTop: 4,
  },
  pickFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  pickFooterBtn: {
    flex: 1,
  },
  detailsToggle: {
    marginTop: 8,
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  spacer: {
    flex: 1,
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pausedCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'stretch',
  },
  pausedButtons: {
    marginTop: 24,
    gap: 12,
  },
});
