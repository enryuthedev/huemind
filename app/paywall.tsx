import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/src/theme';
import { hexToRgb } from '@/src/utils/color';
import { AppButton } from '@/src/components/AppButton';
import { AppText } from '@/src/components/AppText';
import { BrandLogo } from '@/src/components/BrandLogo';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { feedback } from '@/src/services/feedback';
import {
  getOfferings,
  purchasePremium,
  restorePurchases,
  type NormalizedOfferings,
  type PurchasePlan,
} from '@/src/services/purchases';
import { PRIVACY_URL, TERMS_URL } from '@/src/constants/links';

/** Fallbacks used until (or if) RevenueCat offerings are available. */
const FALLBACK_PRICE: Record<PurchasePlan, string> = {
  yearly: '9,99 €',
  lifetime: '19,99 €',
};
const FALLBACK_TRIAL_DAYS = 7;

type IconName = keyof typeof MaterialIcons.glyphMap;

const FEATURES: readonly { icon: IconName; key: string }[] = [
  { icon: 'whatshot', key: 'featureModes' },
  { icon: 'insights', key: 'featureAnalysis' },
  { icon: 'fitness-center', key: 'featureTraining' },
  { icon: 'favorite', key: 'featureSupport' },
];

/**
 * HueMind Pro paywall — presented as a modal (see `app/_layout.tsx`).
 * Yearly (with trial, default) vs. lifetime; prices from RevenueCat with
 * fallbacks. Optional `source` param is reserved for analytics.
 */
export default function PaywallScreen(): React.JSX.Element {
  const theme = useTheme();
  // Short screens: tighter hero + one-line features so plans & CTA stay above the fold.
  const compact = useWindowDimensions().height < 760;
  const { colors } = theme;
  const router = useRouter();
  const { t } = useTranslation();
  const { source } = useLocalSearchParams<{ source?: string }>();
  void source; // reserved for future analytics

  const [selected, setSelected] = useState<PurchasePlan>('yearly');
  const [offerings, setOfferings] = useState<NormalizedOfferings | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void getOfferings().then((o) => {
      if (mounted.current) setOfferings(o);
    });
    return () => {
      mounted.current = false;
    };
  }, []);

  const busy = purchasing || restoring;
  const yearlyPrice = offerings?.yearly?.priceString ?? FALLBACK_PRICE.yearly;
  const lifetimePrice =
    offerings?.lifetime?.priceString ?? FALLBACK_PRICE.lifetime;
  const trialDays = offerings?.yearly
    ? offerings.yearly.hasTrial
      ? offerings.yearly.trialDays
      : 0
    : FALLBACK_TRIAL_DAYS;

  const ctaLabel =
    selected === 'lifetime'
      ? t('paywall.ctaLifetime')
      : trialDays > 0
        ? t('paywall.ctaTrial', { days: trialDays })
        : t('paywall.ctaYearly');

  const legalText =
    selected === 'lifetime'
      ? t('paywall.legalLifetime', { price: lifetimePrice })
      : trialDays > 0
        ? t('paywall.legalYearlyTrial', { days: trialDays, price: yearlyPrice })
        : t('paywall.legalYearly', { price: yearlyPrice });

  function handleClose(): void {
    feedback.tap();
    router.back();
  }

  function selectPlan(plan: PurchasePlan): void {
    if (busy) return;
    feedback.select();
    setSelected(plan);
  }

  async function handlePurchase(): Promise<void> {
    if (busy) return;
    setPurchasing(true);
    const result = await purchasePremium(selected);
    if (!mounted.current) return;
    setPurchasing(false);
    if (result === 'success') {
      router.back();
    } else if (result === 'error') {
      Alert.alert(t('paywall.errorTitle'), t('paywall.errorMsg'));
    }
    // 'cancelled' → stay silently on the paywall.
  }

  async function handleRestore(): Promise<void> {
    if (busy) return;
    setRestoring(true);
    const restored = await restorePurchases();
    if (!mounted.current) return;
    setRestoring(false);
    if (restored) {
      Alert.alert(t('paywall.restoredTitle'), t('paywall.restoredMsg'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert(t('paywall.restoreNoneTitle'), t('paywall.restoreNoneMsg'));
    }
  }

  function openLink(url: string): void {
    void Linking.openURL(url).catch(() => undefined);
  }

  return (
    <ScreenContainer scroll edges={['top', 'bottom']}>
      <View style={styles.inner}>
        {/* Close (X) → back to the previous screen. */}
        <View style={styles.closeRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={handleClose}
            hitSlop={12}
            style={[
              styles.closeButton,
              { backgroundColor: colors.inset, borderRadius: theme.radius.full },
            ]}
          >
            <MaterialIcons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.header}>
          <BrandLogo size={compact ? 44 : 64} />
          <AppText variant={compact ? 'headlineMd' : 'headlineLg'} align="center" style={styles.title}>
            {t('paywall.title')}
          </AppText>
          <AppText
            variant="body"
            color={colors.textMuted}
            align="center"
            style={styles.subtitle}
          >
            {t('paywall.subtitle')}
          </AppText>
        </View>

        {/* Features */}
        <View
          style={[
            styles.features,
            {
              backgroundColor: colors.card,
              borderRadius: theme.radius.lg,
              borderColor: colors.border,
            },
            theme.shadow,
          ]}
        >
          {FEATURES.map(({ icon, key }) => (
            <View key={key} style={styles.featureRow}>
              <View
                style={[
                  styles.featureIcon,
                  {
                    backgroundColor: colors.inset,
                    borderRadius: theme.radius.full,
                  },
                ]}
              >
                <MaterialIcons name={icon} size={18} color={colors.text} />
              </View>
              <View style={styles.featureText}>
                <AppText variant="bodyMedium">{t(`paywall.${key}Title`)}</AppText>
                {compact ? null : (
                  <AppText variant="caption" color={colors.textMuted}>
                    {t(`paywall.${key}Desc`)}
                  </AppText>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.plans}>
          <PlanCard
            label={t('paywall.yearly')}
            price={yearlyPrice}
            period={t('paywall.perYear')}
            note={trialDays > 0 ? t('paywall.trialNote', { days: trialDays }) : undefined}
            badge={t('paywall.bestValue')}
            selected={selected === 'yearly'}
            onPress={() => selectPlan('yearly')}
          />
          <PlanCard
            label={t('paywall.lifetime')}
            price={lifetimePrice}
            period={t('paywall.oneTime')}
            badge={t('paywall.lifetimeBadge')}
            badgeMuted
            selected={selected === 'lifetime'}
            onPress={() => selectPlan('lifetime')}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <View>
            <AppButton
              label={ctaLabel}
              onPress={() => {
                void handlePurchase();
              }}
              disabled={busy}
            />
            {purchasing ? (
              <View style={styles.spinner} pointerEvents="none">
                <ActivityIndicator color={colors.onPrimary} />
              </View>
            ) : null}
          </View>
          <AppButton
            label={t('paywall.restore')}
            variant="ghost"
            onPress={() => {
              void handleRestore();
            }}
            disabled={busy}
          />
          <AppButton
            label={t('paywall.notNow')}
            variant="ghost"
            onPress={handleClose}
            disabled={busy}
          />
        </View>

        {/* Legal footer (required for auto-renewable subscriptions) */}
        <View style={styles.legal}>
          <AppText variant="caption" color={colors.textFaint} align="center">
            {legalText}
          </AppText>
          <View style={styles.legalLinks}>
            <AppText
              variant="caption"
              color={colors.textMuted}
              accessibilityRole="link"
              onPress={() => openLink(TERMS_URL)}
              style={styles.link}
            >
              {t('paywall.terms')}
            </AppText>
            <AppText variant="caption" color={colors.textFaint}>
              ·
            </AppText>
            <AppText
              variant="caption"
              color={colors.textMuted}
              accessibilityRole="link"
              onPress={() => openLink(PRIVACY_URL)}
              style={styles.link}
            >
              {t('paywall.privacy')}
            </AppText>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

interface PlanCardProps {
  label: string;
  price: string;
  period: string;
  note?: string;
  badge: string;
  badgeMuted?: boolean;
  selected: boolean;
  onPress: () => void;
}

/** Selectable plan tile; the badge sits absolutely on the top edge. */
function PlanCard({
  label,
  price,
  period,
  note,
  badge,
  badgeMuted = false,
  selected,
  onPress,
}: PlanCardProps): React.JSX.Element {
  const theme = useTheme();
  const { colors } = theme;
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(value: number): void {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }

  const accentRgb = hexToRgb(colors.text);
  const selectedBg = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.06)`;

  return (
    <Animated.View style={[styles.planWrap, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected, checked: selected }}
        accessibilityLabel={`${label}, ${price} ${period}${note ? `, ${note}` : ''}`}
        onPress={onPress}
        onPressIn={() => animateTo(0.99)}
        onPressOut={() => animateTo(1)}
        style={[
          styles.planCard,
          {
            backgroundColor: selected ? selectedBg : colors.card,
            borderRadius: theme.radius.lg,
            borderColor: selected ? colors.text : colors.border,
            borderWidth: selected ? 2 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.radio,
            {
              borderColor: selected ? colors.text : colors.borderStrong,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          {selected ? (
            <View
              style={[
                styles.radioDot,
                { backgroundColor: colors.text, borderRadius: theme.radius.full },
              ]}
            />
          ) : null}
        </View>
        <AppText variant="title" numberOfLines={1} style={styles.planLabel}>
          {label}
        </AppText>
        <AppText
          variant="headlineMd"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {price}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {period}
        </AppText>
        {note ? (
          <AppText
            variant="caption"
            color={colors.text}
            numberOfLines={1}
            style={styles.planNote}
          >
            {note}
          </AppText>
        ) : null}
      </Pressable>

      {/* Badge: absolute + centered, width-capped so it can't overflow at 360dp. */}
      <View style={styles.badgeWrap} pointerEvents="none">
        <View
          style={[
            styles.badge,
            {
              backgroundColor: badgeMuted ? colors.inset : colors.primary,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          <AppText
            variant="label"
            color={badgeMuted ? colors.textMuted : colors.onPrimary}
            numberOfLines={1}
            style={styles.badgeText}
          >
            {badge}
          </AppText>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inner: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingBottom: 16,
  },
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
  },
  title: {
    marginTop: 12,
  },
  subtitle: {
    marginTop: 4,
  },
  features: {
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  plans: {
    marginTop: 28,
    flexDirection: 'row',
    gap: 12,
  },
  planWrap: {
    flex: 1,
    minWidth: 0,
  },
  planCard: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 14,
  },
  radio: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
  },
  planLabel: {
    marginTop: 10,
  },
  planNote: {
    marginTop: 6,
  },
  badgeWrap: {
    position: 'absolute',
    top: -11,
    left: 8,
    right: 8,
    alignItems: 'center',
  },
  badge: {
    maxWidth: '100%',
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  badgeText: {
    textTransform: 'uppercase',
  },
  actions: {
    marginTop: 24,
    gap: 4,
  },
  spinner: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  legal: {
    marginTop: 12,
    gap: 8,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  link: {
    textDecorationLine: 'underline',
    paddingVertical: 4,
  },
});
